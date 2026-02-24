import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../client', () => ({ sendMessage: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../state-manager', () => ({ setUserState: vi.fn().mockResolvedValue(undefined) }));

const mockCheckStatus = vi.fn().mockResolvedValue('SIGNED' as const);
vi.mock('@/lib/services/signature', () => ({
    getSignatureProvider: () => ({
        checkStatus: (...args: unknown[]) => mockCheckStatus(...args),
    }),
}));

import { handleAssinaturaContrato } from '../assinatura-contrato';
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
        currentFlow: 'AGUARDANDO_ASSINATURA',
        currentStep: 'WAITING_SIGNATURE_CONFIRMATION',
        data: { envelopeId: 'env-abc' },
        lastInteraction: new Date(),
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    mockCheckStatus.mockResolvedValue('SIGNED');
});

// ---------------------------------------------------------------------------
// Confirmation keywords — signed
// ---------------------------------------------------------------------------
describe('handleAssinaturaContrato — confirmed + SIGNED', () => {
    it.each([
        ['JÁ ASSINEI', 'upper case phrase'],
        ['já assinei', 'lower case phrase'],
        ['ASSINEI', 'single keyword'],
        ['PRONTO', 'PRONTO keyword'],
        ['OK', 'OK keyword'],
        ['1', 'option 1'],
    ])('"%s" (%s) triggers signature check', async (input) => {
        await handleAssinaturaContrato(makeMsg(input), makeState());

        expect(mockCheckStatus).toHaveBeenCalledWith('env-abc');
    });

    it('sends "Verificando" message before checking', async () => {
        await handleAssinaturaContrato(makeMsg('JÁ ASSINEI'), makeState());

        const firstMsg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(firstMsg).toContain('Verificando');
    });

    it('sends success message when status is SIGNED', async () => {
        await handleAssinaturaContrato(makeMsg('JÁ ASSINEI'), makeState());

        const calls = (sendMessage as ReturnType<typeof vi.fn>).mock.calls;
        const successMsg = calls[calls.length - 1][1];
        expect(successMsg).toContain('Contrato Validado');
        expect(successMsg).toContain('PIX');
    });

    it('sets state to AGUARDANDO_PAGAMENTO when SIGNED', async () => {
        await handleAssinaturaContrato(makeMsg('JÁ ASSINEI'), makeState());

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000@s.whatsapp.net',
            expect.objectContaining({
                currentFlow: 'AGUARDANDO_PAGAMENTO',
                currentStep: 'WAITING_PAYMENT_METHOD',
                data: expect.objectContaining({
                    contratoAssinado: true,
                }),
            }),
        );
    });

    it('state data includes assinadoEm as ISO string', async () => {
        await handleAssinaturaContrato(makeMsg('JÁ ASSINEI'), makeState());

        const stateCall = (setUserState as ReturnType<typeof vi.fn>).mock.calls[0];
        const data = stateCall[1].data;
        expect(data.assinadoEm).toBeDefined();
        expect(typeof data.assinadoEm).toBe('string');
        expect(new Date(data.assinadoEm).toISOString()).toBe(data.assinadoEm);
    });
});

// ---------------------------------------------------------------------------
// Confirmation keywords — NOT signed (PENDING)
// ---------------------------------------------------------------------------
describe('handleAssinaturaContrato — confirmed + NOT SIGNED', () => {
    it('sends "not yet signed" message when status is PENDING', async () => {
        mockCheckStatus.mockResolvedValue('PENDING');

        await handleAssinaturaContrato(makeMsg('JÁ ASSINEI'), makeState());

        const calls = (sendMessage as ReturnType<typeof vi.fn>).mock.calls;
        const lastMsg = calls[calls.length - 1][1];
        expect(lastMsg).toContain('não identificamos');
        expect(lastMsg).toContain('JÁ ASSINEI');
    });

    it('does NOT set state when signature is pending', async () => {
        mockCheckStatus.mockResolvedValue('PENDING');

        await handleAssinaturaContrato(makeMsg('JÁ ASSINEI'), makeState());

        expect(setUserState).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// Missing envelope
// ---------------------------------------------------------------------------
describe('handleAssinaturaContrato — missing envelopeId', () => {
    it('sends error when envelopeId is missing from state.data', async () => {
        await handleAssinaturaContrato(makeMsg('JÁ ASSINEI'), makeState({ data: {} }));

        const calls = (sendMessage as ReturnType<typeof vi.fn>).mock.calls;
        const lastMsg = calls[calls.length - 1][1];
        expect(lastMsg).toContain('Erro');
        expect(lastMsg).toContain('contrato');
    });

    it('does NOT call checkStatus when envelopeId is absent', async () => {
        await handleAssinaturaContrato(makeMsg('JÁ ASSINEI'), makeState({ data: {} }));

        expect(mockCheckStatus).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// Provider error
// ---------------------------------------------------------------------------
describe('handleAssinaturaContrato — provider error', () => {
    it('sends technical error message on checkStatus failure', async () => {
        mockCheckStatus.mockRejectedValueOnce(new Error('timeout'));

        await handleAssinaturaContrato(makeMsg('JÁ ASSINEI'), makeState());

        const calls = (sendMessage as ReturnType<typeof vi.fn>).mock.calls;
        const lastMsg = calls[calls.length - 1][1];
        expect(lastMsg).toContain('Erro');
    });

    it('does NOT set state on provider error', async () => {
        mockCheckStatus.mockRejectedValueOnce(new Error('timeout'));

        await handleAssinaturaContrato(makeMsg('JÁ ASSINEI'), makeState());

        expect(setUserState).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// Invalid input
// ---------------------------------------------------------------------------
describe('handleAssinaturaContrato — invalid input', () => {
    it('sends prompt to type JÁ ASSINEI', async () => {
        await handleAssinaturaContrato(makeMsg('hello'), makeState());

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('JÁ ASSINEI');
        expect(msg).toContain('AJUDA');
    });

    it('does NOT call checkStatus on invalid input', async () => {
        await handleAssinaturaContrato(makeMsg('hello'), makeState());

        expect(mockCheckStatus).not.toHaveBeenCalled();
    });

    it('does NOT set state on invalid input', async () => {
        await handleAssinaturaContrato(makeMsg('hello'), makeState());

        expect(setUserState).not.toHaveBeenCalled();
    });
});
