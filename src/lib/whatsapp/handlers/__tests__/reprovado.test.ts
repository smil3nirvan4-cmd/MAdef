import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../client', () => ({ sendMessage: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../state-manager', () => ({
    setUserState: vi.fn().mockResolvedValue(undefined),
    checkCooldown: vi.fn().mockResolvedValue(false),
    getCooldownTTL: vi.fn().mockResolvedValue(0),
}));
vi.mock('../quiz', () => ({ handleQuiz: vi.fn().mockResolvedValue(undefined) }));

import { handleReprovado } from '../reprovado';
import { sendMessage } from '../../client';
import { setUserState, checkCooldown, getCooldownTTL } from '../../state-manager';
import { handleQuiz } from '../quiz';
import type { WhatsAppMessage } from '@/types/whatsapp';
import type { UserState } from '@/lib/state/types';

function makeMsg(body: string, from = '5511999990000@s.whatsapp.net'): WhatsAppMessage {
    return { from, body, type: 'text', timestamp: Date.now(), messageId: 'msg-1' };
}

function makeState(overrides: Partial<UserState>): UserState {
    return {
        phone: '5511999990000',
        currentFlow: 'REPROVADO_TRIAGEM',
        currentStep: 'COOLDOWN',
        data: {},
        lastInteraction: new Date(),
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    (checkCooldown as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (getCooldownTTL as ReturnType<typeof vi.fn>).mockResolvedValue(0);
});

describe('handleReprovado', () => {
    it('sends cooldown message when in cooldown', async () => {
        (checkCooldown as ReturnType<typeof vi.fn>).mockResolvedValue(true);
        (getCooldownTTL as ReturnType<typeof vi.fn>).mockResolvedValue(300);

        await handleReprovado(makeMsg('oi'), makeState({ currentStep: 'COOLDOWN' }));

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('Aguarde');
        expect(msg).toContain('5 minuto');
    });

    it('offers retry when cooldown expired and step is COOLDOWN', async () => {
        await handleReprovado(makeMsg('oi'), makeState({ currentStep: 'COOLDOWN' }));

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('Nova Chance');
        expect(msg).toContain('tentar');
        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000@s.whatsapp.net',
            expect.objectContaining({ currentStep: 'AWAITING_RETRY_DECISION' })
        );
    });

    it('restarts quiz when user chooses option 1', async () => {
        await handleReprovado(
            makeMsg('1'),
            makeState({ currentStep: 'AWAITING_RETRY_DECISION', data: { retryCount: 0 } })
        );

        expect(sendMessage).toHaveBeenCalledWith(
            '5511999990000@s.whatsapp.net',
            expect.stringContaining('Preparando novo teste')
        );
        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000@s.whatsapp.net',
            expect.objectContaining({
                currentFlow: 'QUIZ',
                currentStep: 'WELCOME',
            })
        );
        expect(handleQuiz).toHaveBeenCalledOnce();
    });

    it('sends ok message when user chooses option 2', async () => {
        await handleReprovado(
            makeMsg('2'),
            makeState({ currentStep: 'AWAITING_RETRY_DECISION' })
        );

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('Tudo bem');
    });

    it('sends guidance for invalid input in AWAITING_RETRY_DECISION', async () => {
        await handleReprovado(
            makeMsg('abc'),
            makeState({ currentStep: 'AWAITING_RETRY_DECISION' })
        );

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('1');
        expect(msg).toContain('2');
    });
});
