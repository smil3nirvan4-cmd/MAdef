import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../client', () => ({ sendMessage: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../state-manager', () => ({ setUserState: vi.fn().mockResolvedValue(undefined) }));

import { handleAguardando } from '../aguardando';
import { sendMessage } from '../../client';
import type { WhatsAppMessage } from '@/types/whatsapp';
import type { UserState } from '@/lib/state/types';

function makeMsg(body: string, from = '5511999990000@s.whatsapp.net'): WhatsAppMessage {
    return { from, body, type: 'text', timestamp: Date.now(), messageId: 'msg-1' };
}

function makeState(overrides: Partial<UserState>): UserState {
    return {
        phone: '5511999990000',
        currentFlow: 'IDLE',
        currentStep: '',
        data: {},
        lastInteraction: new Date(),
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('handleAguardando', () => {
    it('sends RH message when flow is AGUARDANDO_RH', async () => {
        await handleAguardando(makeMsg('oi'), makeState({ currentFlow: 'AGUARDANDO_RH' }));

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('Cadastro em Análise');
        expect(msg).toContain('equipe de RH');
    });

    it('sends avaliacao message when flow is AGUARDANDO_AVALIACAO', async () => {
        await handleAguardando(makeMsg('oi'), makeState({ currentFlow: 'AGUARDANDO_AVALIACAO' }));

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('Solicitação em Andamento');
        expect(msg).toContain('equipe de avaliação');
    });

    it('message contains 192 for AGUARDANDO_AVALIACAO', async () => {
        await handleAguardando(makeMsg('oi'), makeState({ currentFlow: 'AGUARDANDO_AVALIACAO' }));

        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('192');
    });

    it('message contains AJUDA for AGUARDANDO_RH', async () => {
        await handleAguardando(makeMsg('oi'), makeState({ currentFlow: 'AGUARDANDO_RH' }));

        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('AJUDA');
    });

    it('message contains AJUDA for AGUARDANDO_AVALIACAO', async () => {
        await handleAguardando(makeMsg('oi'), makeState({ currentFlow: 'AGUARDANDO_AVALIACAO' }));

        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('AJUDA');
    });
});
