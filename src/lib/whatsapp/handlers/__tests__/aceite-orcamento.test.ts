import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../client', () => ({ sendMessage: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../state-manager', () => ({ setUserState: vi.fn().mockResolvedValue(undefined) }));

const mockUpdateOrcamento = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/database', () => ({
    DB: { orcamento: { update: (...args: unknown[]) => mockUpdateOrcamento(...args) } },
}));

const mockCreateEnvelope = vi.fn().mockResolvedValue({
    envelopeId: 'env-abc',
    signingUrl: 'https://example.com/sign/env-abc',
});
const mockCheckStatus = vi.fn().mockResolvedValue('PENDING');
vi.mock('@/lib/services/signature', () => ({
    getSignatureProvider: () => ({
        createEnvelope: (...args: unknown[]) => mockCreateEnvelope(...args),
        checkStatus: (...args: unknown[]) => mockCheckStatus(...args),
    }),
}));

vi.mock('@/lib/config/public-url', () => ({
    assertPublicUrl: (rawUrl: string) => new URL(rawUrl),
}));

import { handleAceiteOrcamento } from '../aceite-orcamento';
import { sendMessage } from '../../client';
import { setUserState } from '../../state-manager';
import type { WhatsAppMessage } from '@/types/whatsapp';
import type { UserState } from '@/lib/state/types';

function makeMsg(body: string, from = '5511999990000@s.whatsapp.net'): WhatsAppMessage {
    return { from, body, type: 'text', timestamp: Date.now(), messageId: 'msg-1' };
}

function makeState(overrides: Partial<UserState> = {}): UserState {
    return {
        phone: '5511999990000',
        currentFlow: 'AGUARDANDO_ACEITE_ORCAMENTO',
        currentStep: '',
        data: { orcamentoId: 'orc-123', nome: 'Maria', email: 'maria@test.com' },
        lastInteraction: new Date(),
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateOrcamento.mockResolvedValue(undefined);
    mockCreateEnvelope.mockResolvedValue({
        envelopeId: 'env-abc',
        signingUrl: 'https://example.com/sign/env-abc',
    });
});

// ---------------------------------------------------------------------------
// ACEITO path
// ---------------------------------------------------------------------------
describe('handleAceiteOrcamento — ACEITO', () => {
    it('"ACEITO" updates orcamento status to ACEITO', async () => {
        await handleAceiteOrcamento(makeMsg('ACEITO'), makeState());

        expect(mockUpdateOrcamento).toHaveBeenCalledWith('orc-123', expect.objectContaining({
            status: 'ACEITO',
        }));
    });

    it('"1" is accepted as an alias for ACEITO', async () => {
        await handleAceiteOrcamento(makeMsg('1'), makeState());

        expect(mockUpdateOrcamento).toHaveBeenCalledWith('orc-123', expect.objectContaining({
            status: 'ACEITO',
        }));
    });

    it('"aceito" (lowercase) is accepted', async () => {
        await handleAceiteOrcamento(makeMsg('aceito'), makeState());

        expect(mockUpdateOrcamento).toHaveBeenCalledOnce();
    });

    it('sends a "gerando contrato" message followed by signing URL', async () => {
        await handleAceiteOrcamento(makeMsg('ACEITO'), makeState());

        const calls = (sendMessage as ReturnType<typeof vi.fn>).mock.calls;
        expect(calls.length).toBeGreaterThanOrEqual(2);
        // First message: generating contract
        expect(calls[0][1]).toContain('Gerando contrato');
        // Second message: signing link
        expect(calls[1][1]).toContain('https://example.com/sign/env-abc');
        expect(calls[1][1]).toContain('Assinatura');
    });

    it('calls createEnvelope with orcamentoId in title', async () => {
        await handleAceiteOrcamento(makeMsg('ACEITO'), makeState());

        expect(mockCreateEnvelope).toHaveBeenCalledWith(expect.objectContaining({
            title: expect.stringContaining('orc-123'),
        }));
    });

    it('sets state to AGUARDANDO_ASSINATURA with envelope data', async () => {
        await handleAceiteOrcamento(makeMsg('ACEITO'), makeState());

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000@s.whatsapp.net',
            expect.objectContaining({
                currentFlow: 'AGUARDANDO_ASSINATURA',
                currentStep: 'WAITING_SIGNATURE_CONFIRMATION',
                data: expect.objectContaining({
                    statusOrcamento: 'ACEITO',
                    envelopeId: 'env-abc',
                    signingUrl: 'https://example.com/sign/env-abc',
                }),
            }),
        );
    });

    it('handles createEnvelope error gracefully', async () => {
        mockCreateEnvelope.mockRejectedValueOnce(new Error('provider down'));

        await handleAceiteOrcamento(makeMsg('ACEITO'), makeState());

        const calls = (sendMessage as ReturnType<typeof vi.fn>).mock.calls;
        const lastMsg = calls[calls.length - 1][1];
        expect(lastMsg).toContain('Erro');
    });

    it('preserves existing state.data when setting new state', async () => {
        const state = makeState({ data: { orcamentoId: 'orc-123', nome: 'Maria', email: 'maria@test.com', extra: 'value' } });
        await handleAceiteOrcamento(makeMsg('ACEITO'), state);

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000@s.whatsapp.net',
            expect.objectContaining({
                data: expect.objectContaining({
                    extra: 'value',
                    orcamentoId: 'orc-123',
                }),
            }),
        );
    });
});

// ---------------------------------------------------------------------------
// RECUSO path
// ---------------------------------------------------------------------------
describe('handleAceiteOrcamento — RECUSO', () => {
    it('"RECUSO" sends revision options', async () => {
        await handleAceiteOrcamento(makeMsg('RECUSO'), makeState());

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('Revisão');
        expect(msg).toContain('Consultor');
    });

    it('"2" is accepted as an alias for RECUSO', async () => {
        await handleAceiteOrcamento(makeMsg('2'), makeState());

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('Revisão');
    });

    it('"recuso" (lowercase) is accepted', async () => {
        await handleAceiteOrcamento(makeMsg('recuso'), makeState());

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('Revisão');
    });

    it('"RECUSO motivo" (starts with RECUSO) is accepted', async () => {
        await handleAceiteOrcamento(makeMsg('RECUSO muito caro'), makeState());

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('Revisão');
    });

    it('sets state to AWAITING_REFUSAL_REASON', async () => {
        await handleAceiteOrcamento(makeMsg('RECUSO'), makeState());

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000@s.whatsapp.net',
            expect.objectContaining({
                currentStep: 'AWAITING_REFUSAL_REASON',
                data: expect.objectContaining({ statusOrcamento: 'RECUSADO' }),
            }),
        );
    });

    it('does NOT update orcamento in DB on refusal', async () => {
        await handleAceiteOrcamento(makeMsg('RECUSO'), makeState());

        expect(mockUpdateOrcamento).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// Invalid input
// ---------------------------------------------------------------------------
describe('handleAceiteOrcamento — invalid input', () => {
    it('sends prompt to respond ACEITO or RECUSO', async () => {
        await handleAceiteOrcamento(makeMsg('maybe'), makeState());

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('ACEITO');
        expect(msg).toContain('RECUSO');
    });

    it('empty body triggers invalid message', async () => {
        await handleAceiteOrcamento(makeMsg(''), makeState());

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('ACEITO');
    });

    it('does not call DB update or setUserState on invalid input', async () => {
        await handleAceiteOrcamento(makeMsg('xyz'), makeState());

        expect(mockUpdateOrcamento).not.toHaveBeenCalled();
        expect(setUserState).not.toHaveBeenCalled();
    });
});
