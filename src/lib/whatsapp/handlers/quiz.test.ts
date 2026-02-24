import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../client', () => ({
    sendMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../state-manager', () => ({
    setUserState: vi.fn().mockResolvedValue(undefined),
    getUserState: vi.fn().mockResolvedValue({ data: { area: 'Cuidador(a)', nome: 'Ana' } }),
    checkCooldown: vi.fn().mockResolvedValue(false),
    getCooldownTTL: vi.fn().mockResolvedValue(180),
    setCooldown: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/database', () => ({
    DB: {
        cuidador: {
            upsert: vi.fn().mockResolvedValue(undefined),
        },
    },
}));

import { handleQuiz } from './quiz';
import { sendMessage } from '../client';
import { setUserState, checkCooldown, getCooldownTTL, setCooldown } from '../state-manager';
import type { WhatsAppMessage } from '@/types/whatsapp';
import type { UserState } from '@/lib/state/types';

function makeMsg(body: string, from = '5511999990000'): WhatsAppMessage {
    return { from, body, type: 'text', timestamp: Date.now(), messageId: 'msg-1' };
}

function s(overrides: Partial<UserState>): UserState {
    return {
        phone: '5511999990000',
        currentFlow: 'QUIZ',
        currentStep: 'WELCOME',
        data: {},
        lastInteraction: new Date(),
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    (checkCooldown as ReturnType<typeof vi.fn>).mockResolvedValue(false);
});

describe('handleQuiz', () => {
    it('shows quiz intro on WELCOME step', async () => {
        await handleQuiz(makeMsg('oi'), s({ currentStep: 'WELCOME', data: { area: 'Cuidador(a)' } }));

        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('Triagem de Competência');
        expect(msg).toContain('70%');
        expect(setUserState).toHaveBeenCalledWith('5511999990000', { currentStep: 'READY_TO_START' });
    });

    it('sends first question on READY_TO_START', async () => {
        await handleQuiz(makeMsg('INICIAR'), s({ currentStep: 'READY_TO_START' }));

        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('Pergunta 1/15');
        expect(setUserState).toHaveBeenCalledWith('5511999990000', { currentStep: 'QUESTION_0' });
    });

    it('rejects invalid answer (not 1-4)', async () => {
        await handleQuiz(makeMsg('5'), s({ currentStep: 'QUESTION_0', data: { score: 0 } }));

        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('inválida');
    });

    it('rejects non-numeric answer', async () => {
        await handleQuiz(makeMsg('abc'), s({ currentStep: 'QUESTION_0', data: { score: 0 } }));

        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('inválida');
    });

    it('advances to next question on valid answer', async () => {
        await handleQuiz(makeMsg('2'), s({ currentStep: 'QUESTION_0', data: { score: 0 } }));

        expect(setUserState).toHaveBeenCalledWith('5511999990000', { data: { score: 1 } });
        const sendCalls = (sendMessage as ReturnType<typeof vi.fn>).mock.calls;
        const lastMsg = sendCalls[sendCalls.length - 1][1];
        expect(lastMsg).toContain('Pergunta 2/15');
    });

    it('wrong answer does not increment score', async () => {
        await handleQuiz(makeMsg('1'), s({ currentStep: 'QUESTION_0', data: { score: 0 } }));

        expect(setUserState).toHaveBeenCalledWith('5511999990000', { data: { score: 0 } });
    });

    it('blocks quiz if in cooldown', async () => {
        (checkCooldown as ReturnType<typeof vi.fn>).mockResolvedValue(true);
        (getCooldownTTL as ReturnType<typeof vi.fn>).mockResolvedValue(180);

        await handleQuiz(makeMsg('INICIAR'), s({ currentStep: 'WELCOME' }));

        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('Aguarde');
        expect(msg).toContain('3 minuto');
        expect(setUserState).not.toHaveBeenCalled();
    });

    it('finishes quiz with passing score', async () => {
        await handleQuiz(makeMsg('2'), s({
            currentStep: 'QUESTION_14',
            data: { score: 10, area: 'Cuidador(a)', nome: 'Ana' },
        }));

        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('Parabéns');
        expect(msg).toContain('AGUARDANDO_RH');
    });

    it('finishes quiz with failing score', async () => {
        await handleQuiz(makeMsg('1'), s({
            currentStep: 'QUESTION_14',
            data: { score: 5, area: 'Cuidador(a)' },
        }));

        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('Insuficiente');
        expect(setCooldown).toHaveBeenCalled();
    });
});
