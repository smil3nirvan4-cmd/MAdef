import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../client', () => ({ sendMessage: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../state-manager', () => ({ setUserState: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/db', () => ({
    prisma: {
        paciente: {
            update: vi.fn().mockResolvedValue({ id: 'pac-1' }),
        },
    },
}));

import { handleConfirmacaoProposta, handleAssinaturaContrato } from '../confirmacao-proposta';
import { sendMessage } from '../../client';
import { setUserState } from '../../state-manager';
import { prisma } from '@/lib/db';
import type { WhatsAppMessage } from '@/types/whatsapp';
import type { UserState } from '@/lib/state/types';

function makeMsg(body: string, from = '5511999990000@s.whatsapp.net'): WhatsAppMessage {
    return { from, body, type: 'text', timestamp: Date.now(), messageId: 'msg-1' };
}

function makePropostaState(overrides: Partial<UserState> = {}): UserState {
    return {
        phone: '5511999990000',
        currentFlow: 'AGUARDANDO_RESPOSTA_PROPOSTA',
        currentStep: '',
        data: {},
        lastInteraction: new Date(),
        ...overrides,
    };
}

function makeContratoState(overrides: Partial<UserState> = {}): UserState {
    return {
        phone: '5511999990000',
        currentFlow: 'AGUARDANDO_CONTRATO',
        currentStep: '',
        data: {},
        lastInteraction: new Date(),
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    (prisma.paciente.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'pac-1' });
});

// ===========================================================================
// handleConfirmacaoProposta
// ===========================================================================

// ---------------------------------------------------------------------------
// Confirmation (aceita)
// ---------------------------------------------------------------------------
describe('handleConfirmacaoProposta — confirmation', () => {
    it.each([
        ['confirmo'],
        ['aceito'],
        ['sim'],
        ['ok'],
    ])('"%s" updates paciente status to PROPOSTA_ACEITA', async (input) => {
        await handleConfirmacaoProposta(makeMsg(input), makePropostaState());

        expect(prisma.paciente.update).toHaveBeenCalledWith({
            where: { telefone: '5511999990000' },
            data: { status: 'PROPOSTA_ACEITA' },
        });
    });

    it('"CONFIRMO" (uppercase) is case-insensitive', async () => {
        await handleConfirmacaoProposta(makeMsg('CONFIRMO'), makePropostaState());

        expect(prisma.paciente.update).toHaveBeenCalledOnce();
    });

    it('sends confirmation message with contrato mention', async () => {
        await handleConfirmacaoProposta(makeMsg('confirmo'), makePropostaState());

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('Proposta Confirmada');
        expect(msg).toContain('contrato');
    });

    it('sets state to AGUARDANDO_CONTRATO / PROPOSTA_ACEITA', async () => {
        await handleConfirmacaoProposta(makeMsg('confirmo'), makePropostaState());

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000',
            expect.objectContaining({
                currentFlow: 'AGUARDANDO_CONTRATO',
                currentStep: 'PROPOSTA_ACEITA',
                data: expect.objectContaining({
                    propostaAceitaEm: expect.any(String),
                }),
            }),
        );
    });

    it('state data.propostaAceitaEm is a valid ISO date', async () => {
        await handleConfirmacaoProposta(makeMsg('confirmo'), makePropostaState());

        const stateCall = (setUserState as ReturnType<typeof vi.fn>).mock.calls[0];
        const data = stateCall[1].data;
        expect(new Date(data.propostaAceitaEm).toISOString()).toBe(data.propostaAceitaEm);
    });

    it('preserves existing state.data on accept', async () => {
        const state = makePropostaState({ data: { existingKey: 'value' } });
        await handleConfirmacaoProposta(makeMsg('confirmo'), state);

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000',
            expect.objectContaining({
                data: expect.objectContaining({ existingKey: 'value' }),
            }),
        );
    });

    it('handles DB error on confirmation gracefully', async () => {
        (prisma.paciente.update as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('DB error'));

        await handleConfirmacaoProposta(makeMsg('confirmo'), makePropostaState());

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('erro');
    });

    it('strips @s.whatsapp.net from phone for DB lookup', async () => {
        await handleConfirmacaoProposta(makeMsg('confirmo', '5511888880000@s.whatsapp.net'), makePropostaState());

        expect(prisma.paciente.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { telefone: '5511888880000' },
            }),
        );
    });

    it('strips @lid from phone for DB lookup', async () => {
        await handleConfirmacaoProposta(makeMsg('confirmo', '5511888880000@lid'), makePropostaState());

        expect(prisma.paciente.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { telefone: '5511888880000' },
            }),
        );
    });
});

// ---------------------------------------------------------------------------
// Refusal (recusa)
// ---------------------------------------------------------------------------
describe('handleConfirmacaoProposta — refusal', () => {
    it.each([
        ['recuso'],
        ['não'],
        ['nao'],
        ['cancelar'],
    ])('"%s" updates paciente status to PROPOSTA_RECUSADA', async (input) => {
        await handleConfirmacaoProposta(makeMsg(input), makePropostaState());

        expect(prisma.paciente.update).toHaveBeenCalledWith({
            where: { telefone: '5511999990000' },
            data: { status: 'PROPOSTA_RECUSADA' },
        });
    });

    it('sends refusal message mentioning MENU and AJUDA', async () => {
        await handleConfirmacaoProposta(makeMsg('recuso'), makePropostaState());

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('MENU');
        expect(msg).toContain('AJUDA');
    });

    it('sets state to IDLE with propostaRecusadaEm', async () => {
        await handleConfirmacaoProposta(makeMsg('recuso'), makePropostaState());

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000',
            expect.objectContaining({
                currentFlow: 'IDLE',
                currentStep: '',
                data: expect.objectContaining({
                    propostaRecusadaEm: expect.any(String),
                }),
            }),
        );
    });

    it('handles DB error on refusal silently (no crash)', async () => {
        (prisma.paciente.update as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('DB error'));

        // Should not throw
        await expect(
            handleConfirmacaoProposta(makeMsg('recuso'), makePropostaState())
        ).resolves.toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// Invalid input
// ---------------------------------------------------------------------------
describe('handleConfirmacaoProposta — invalid input', () => {
    it('sends prompt with CONFIRMO and RECUSO options', async () => {
        await handleConfirmacaoProposta(makeMsg('maybe'), makePropostaState());

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('CONFIRMO');
        expect(msg).toContain('RECUSO');
    });

    it('does NOT call DB on invalid input', async () => {
        await handleConfirmacaoProposta(makeMsg('talvez'), makePropostaState());

        expect(prisma.paciente.update).not.toHaveBeenCalled();
    });

    it('does NOT call setUserState on invalid input', async () => {
        await handleConfirmacaoProposta(makeMsg('talvez'), makePropostaState());

        expect(setUserState).not.toHaveBeenCalled();
    });

    it('empty body triggers invalid prompt', async () => {
        await handleConfirmacaoProposta(makeMsg(''), makePropostaState());

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('CONFIRMO');
    });
});

// ===========================================================================
// handleAssinaturaContrato (from confirmacao-proposta.ts)
// ===========================================================================

// ---------------------------------------------------------------------------
// Signed confirmation
// ---------------------------------------------------------------------------
describe('handleAssinaturaContrato (confirmacao-proposta) — signed', () => {
    it.each([
        ['assinado'],
        ['assinei'],
        ['pronto'],
    ])('"%s" updates paciente status to ATIVO', async (input) => {
        await handleAssinaturaContrato(makeMsg(input), makeContratoState());

        expect(prisma.paciente.update).toHaveBeenCalledWith({
            where: { telefone: '5511999990000' },
            data: { status: 'ATIVO' },
        });
    });

    it('"ASSINADO" (uppercase) is case-insensitive', async () => {
        await handleAssinaturaContrato(makeMsg('ASSINADO'), makeContratoState());

        expect(prisma.paciente.update).toHaveBeenCalledOnce();
    });

    it('sends welcome message with next steps', async () => {
        await handleAssinaturaContrato(makeMsg('assinado'), makeContratoState());

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('Bem-vindo');
        expect(msg).toContain('Mãos Amigas');
        expect(msg).toContain('MENU');
    });

    it('sets state to CLIENTE_ATIVO / CONTRATO_ASSINADO', async () => {
        await handleAssinaturaContrato(makeMsg('assinado'), makeContratoState());

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000',
            expect.objectContaining({
                currentFlow: 'CLIENTE_ATIVO',
                currentStep: 'CONTRATO_ASSINADO',
                data: expect.objectContaining({
                    contratoAssinadoEm: expect.any(String),
                }),
            }),
        );
    });

    it('state data.contratoAssinadoEm is a valid ISO date', async () => {
        await handleAssinaturaContrato(makeMsg('assinado'), makeContratoState());

        const stateCall = (setUserState as ReturnType<typeof vi.fn>).mock.calls[0];
        const data = stateCall[1].data;
        expect(new Date(data.contratoAssinadoEm).toISOString()).toBe(data.contratoAssinadoEm);
    });

    it('preserves existing state.data on confirmation', async () => {
        const state = makeContratoState({ data: { keepMe: 'yes' } });
        await handleAssinaturaContrato(makeMsg('assinado'), state);

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000',
            expect.objectContaining({
                data: expect.objectContaining({ keepMe: 'yes' }),
            }),
        );
    });

    it('handles DB error on sign confirmation silently', async () => {
        (prisma.paciente.update as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('DB error'));

        await expect(
            handleAssinaturaContrato(makeMsg('assinado'), makeContratoState())
        ).resolves.toBeUndefined();
    });

    it('strips @s.whatsapp.net from phone for DB', async () => {
        await handleAssinaturaContrato(makeMsg('assinado', '5511777770000@s.whatsapp.net'), makeContratoState());

        expect(prisma.paciente.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { telefone: '5511777770000' },
            }),
        );
    });
});

// ---------------------------------------------------------------------------
// Invalid input
// ---------------------------------------------------------------------------
describe('handleAssinaturaContrato (confirmacao-proposta) — invalid', () => {
    it('sends prompt mentioning ASSINADO', async () => {
        await handleAssinaturaContrato(makeMsg('hello'), makeContratoState());

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('ASSINADO');
    });

    it('does NOT call DB on invalid input', async () => {
        await handleAssinaturaContrato(makeMsg('hello'), makeContratoState());

        expect(prisma.paciente.update).not.toHaveBeenCalled();
    });

    it('does NOT call setUserState on invalid input', async () => {
        await handleAssinaturaContrato(makeMsg('hello'), makeContratoState());

        expect(setUserState).not.toHaveBeenCalled();
    });
});
