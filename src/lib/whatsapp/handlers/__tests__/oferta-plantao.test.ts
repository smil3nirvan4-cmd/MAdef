import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../client', () => ({ sendMessage: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../state-manager', () => ({ setUserState: vi.fn().mockResolvedValue(undefined) }));

const mockAlocacaoUpdate = vi.fn().mockResolvedValue(undefined);
const mockFormLogSubmission = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/database', () => ({
    DB: {
        alocacao: { update: (...args: unknown[]) => mockAlocacaoUpdate(...args) },
        form: { logSubmission: (...args: unknown[]) => mockFormLogSubmission(...args) },
    },
}));

import { handleOfertaPlantao } from '../oferta-plantao';
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
        currentFlow: 'OFERTA_PLANTAO',
        currentStep: '',
        data: { ofertaId: 'oferta-1', slotId: 'slot-1', alocacaoId: 'aloc-1' },
        lastInteraction: new Date(),
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    mockAlocacaoUpdate.mockResolvedValue(undefined);
    mockFormLogSubmission.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// ACEITO path
// ---------------------------------------------------------------------------
describe('handleOfertaPlantao — ACEITO', () => {
    it('"ACEITO" updates alocacao status to CONFIRMADO', async () => {
        await handleOfertaPlantao(makeMsg('ACEITO'), makeState());

        expect(mockAlocacaoUpdate).toHaveBeenCalledWith('aloc-1', expect.objectContaining({
            status: 'CONFIRMADO',
        }));
    });

    it('"1" is accepted as an alias for ACEITO', async () => {
        await handleOfertaPlantao(makeMsg('1'), makeState());

        expect(mockAlocacaoUpdate).toHaveBeenCalledWith('aloc-1', expect.objectContaining({
            status: 'CONFIRMADO',
        }));
    });

    it('"aceito" (lowercase) is case-insensitive', async () => {
        await handleOfertaPlantao(makeMsg('aceito'), makeState());

        expect(mockAlocacaoUpdate).toHaveBeenCalledOnce();
    });

    it('"  ACEITO  " (with spaces) is trimmed', async () => {
        await handleOfertaPlantao(makeMsg('  ACEITO  '), makeState());

        expect(mockAlocacaoUpdate).toHaveBeenCalledOnce();
    });

    it('sends confirmation message with briefing info', async () => {
        await handleOfertaPlantao(makeMsg('ACEITO'), makeState());

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('confirmado');
        expect(msg).toContain('Briefing');
    });

    it('sets state to IDLE after acceptance', async () => {
        await handleOfertaPlantao(makeMsg('ACEITO'), makeState());

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000@s.whatsapp.net',
            expect.objectContaining({
                currentFlow: 'IDLE',
                currentStep: '',
                data: {},
            }),
        );
    });

    it('update includes respondidoEm date', async () => {
        await handleOfertaPlantao(makeMsg('ACEITO'), makeState());

        const updateCall = mockAlocacaoUpdate.mock.calls[0];
        expect(updateCall[1].respondidoEm).toBeInstanceOf(Date);
    });
});

// ---------------------------------------------------------------------------
// RECUSO path
// ---------------------------------------------------------------------------
describe('handleOfertaPlantao — RECUSO', () => {
    it('"RECUSO" updates alocacao status to RECUSADO', async () => {
        await handleOfertaPlantao(makeMsg('RECUSO'), makeState());

        expect(mockAlocacaoUpdate).toHaveBeenCalledWith('aloc-1', expect.objectContaining({
            status: 'RECUSADO',
        }));
    });

    it('"2" is accepted as an alias for RECUSO', async () => {
        await handleOfertaPlantao(makeMsg('2'), makeState());

        expect(mockAlocacaoUpdate).toHaveBeenCalledWith('aloc-1', expect.objectContaining({
            status: 'RECUSADO',
        }));
    });

    it('"recuso" (lowercase) is case-insensitive', async () => {
        await handleOfertaPlantao(makeMsg('recuso'), makeState());

        expect(mockAlocacaoUpdate).toHaveBeenCalledOnce();
    });

    it('sends motivo options menu', async () => {
        await handleOfertaPlantao(makeMsg('RECUSO'), makeState());

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('motivo');
        expect(msg).toContain('Horário');
        expect(msg).toContain('Local');
        expect(msg).toContain('Valor');
    });

    it('sets state to AWAITING_MOTIVO_RECUSA', async () => {
        await handleOfertaPlantao(makeMsg('RECUSO'), makeState());

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000@s.whatsapp.net',
            expect.objectContaining({
                currentStep: 'AWAITING_MOTIVO_RECUSA',
            }),
        );
    });

    it('update includes respondidoEm date', async () => {
        await handleOfertaPlantao(makeMsg('RECUSO'), makeState());

        const updateCall = mockAlocacaoUpdate.mock.calls[0];
        expect(updateCall[1].respondidoEm).toBeInstanceOf(Date);
    });
});

// ---------------------------------------------------------------------------
// AWAITING_MOTIVO_RECUSA — motivo selection
// Note: "1" and "2" are caught by the ACEITO/RECUSO checks first (before
// the currentStep check), so only "3", "4", "5" and free text reach the
// motivo branch.
// ---------------------------------------------------------------------------
describe('handleOfertaPlantao — AWAITING_MOTIVO_RECUSA', () => {
    const awaitingState = (overrides: Partial<UserState> = {}) =>
        makeState({ currentStep: 'AWAITING_MOTIVO_RECUSA', ...overrides });

    it.each([
        ['3', 'Valor insuficiente'],
        ['4', 'Já tem compromisso'],
        ['5', 'Outro'],
    ])('option "%s" logs motivo "%s"', async (input, expectedMotivo) => {
        await handleOfertaPlantao(makeMsg(input), awaitingState());

        expect(mockFormLogSubmission).toHaveBeenCalledWith(
            'RECUSA_PLANTAO',
            expect.objectContaining({
                alocacaoId: 'aloc-1',
                motivo: expectedMotivo,
            }),
            '5511999990000@s.whatsapp.net',
        );
    });

    it('"1" in AWAITING_MOTIVO_RECUSA is caught by ACEITO branch first', async () => {
        await handleOfertaPlantao(makeMsg('1'), awaitingState());

        // "1" matches the ACEITO check before reaching the motivo step
        expect(mockAlocacaoUpdate).toHaveBeenCalledWith('aloc-1', expect.objectContaining({
            status: 'CONFIRMADO',
        }));
        expect(mockFormLogSubmission).not.toHaveBeenCalled();
    });

    it('"2" in AWAITING_MOTIVO_RECUSA is caught by RECUSO branch first', async () => {
        await handleOfertaPlantao(makeMsg('2'), awaitingState());

        // "2" matches the RECUSO check before reaching the motivo step
        expect(mockAlocacaoUpdate).toHaveBeenCalledWith('aloc-1', expect.objectContaining({
            status: 'RECUSADO',
        }));
        expect(mockFormLogSubmission).not.toHaveBeenCalled();
    });

    it('free text motivo is stored verbatim', async () => {
        await handleOfertaPlantao(makeMsg('Estou doente'), awaitingState());

        expect(mockFormLogSubmission).toHaveBeenCalledWith(
            'RECUSA_PLANTAO',
            expect.objectContaining({
                motivo: 'Estou doente',
            }),
            '5511999990000@s.whatsapp.net',
        );
    });

    it('sends thank-you message after motivo', async () => {
        await handleOfertaPlantao(makeMsg('3'), awaitingState());

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('Obrigado');
    });

    it('sets state to IDLE after motivo', async () => {
        await handleOfertaPlantao(makeMsg('3'), awaitingState());

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000@s.whatsapp.net',
            expect.objectContaining({
                currentFlow: 'IDLE',
                currentStep: '',
                data: {},
            }),
        );
    });

    it('does NOT call alocacao.update on motivo step with valid motivo input', async () => {
        await handleOfertaPlantao(makeMsg('3'), awaitingState());

        expect(mockAlocacaoUpdate).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// Invalid input (initial step, not AWAITING_MOTIVO_RECUSA)
// ---------------------------------------------------------------------------
describe('handleOfertaPlantao — invalid input', () => {
    it('sends prompt to respond ACEITO or RECUSO', async () => {
        await handleOfertaPlantao(makeMsg('maybe'), makeState());

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('ACEITO');
        expect(msg).toContain('RECUSO');
    });

    it('does NOT update alocacao on invalid input', async () => {
        await handleOfertaPlantao(makeMsg('maybe'), makeState());

        expect(mockAlocacaoUpdate).not.toHaveBeenCalled();
    });

    it('does NOT set state on invalid input', async () => {
        await handleOfertaPlantao(makeMsg('maybe'), makeState());

        expect(setUserState).not.toHaveBeenCalled();
    });

    it('empty body triggers invalid prompt', async () => {
        await handleOfertaPlantao(makeMsg(''), makeState());

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('ACEITO');
        expect(msg).toContain('RECUSO');
    });

    it('"3" is invalid on the initial step', async () => {
        await handleOfertaPlantao(makeMsg('3'), makeState());

        expect(sendMessage).toHaveBeenCalledOnce();
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('ACEITO');
        expect(msg).toContain('RECUSO');
    });
});
