import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../client', () => ({
    sendMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../state-manager', () => ({
    setUserState: vi.fn().mockResolvedValue(undefined),
    acquireSlotLock: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/prisma', () => ({
    prisma: {
        alocacao: {
            findFirst: vi.fn().mockResolvedValue(null),
            create: vi.fn().mockResolvedValue({ id: 'aloc-1' }),
        },
    },
}));

import { handleEscolhaSlot } from './escolha-slot';
import { sendMessage } from '../client';
import { setUserState, acquireSlotLock } from '../state-manager';
import { prisma } from '@/lib/prisma';
import type { WhatsAppMessage } from '@/types/whatsapp';
import type { UserState } from '@/lib/state/types';

function makeMsg(body: string, from = '5511999990000@s.whatsapp.net'): WhatsAppMessage {
    return { from, body, type: 'text', timestamp: Date.now(), messageId: 'msg-1' };
}

const baseState: UserState = {
    phone: '5511999990000',
    currentFlow: 'ESCOLHA_SLOT',
    currentStep: 'ESCOLHA',
    data: {
        equipeId: 'eq-1',
        cuidadorId: 'cui-1',
        pacienteId: 'pac-1',
        pacienteNome: 'Dona Maria',
    },
    lastInteraction: new Date(),
};

beforeEach(() => {
    vi.clearAllMocks();
    (acquireSlotLock as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.alocacao.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
});

describe('handleEscolhaSlot', () => {
    it('rejects invalid slot format', async () => {
        await handleEscolhaSlot(makeMsg('oi'), baseState);

        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('Formato inválido');
    });

    it('parses "ESCOLHER C1" format correctly', async () => {
        await handleEscolhaSlot(makeMsg('ESCOLHER C1'), baseState);

        expect(acquireSlotLock).toHaveBeenCalledWith('slot:eq-1:C1', 'cui-1');
        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('PARABÉNS');
        expect(msg).toContain('C1');
    });

    it('parses bare "C3" format', async () => {
        await handleEscolhaSlot(makeMsg('c3'), baseState);

        expect(acquireSlotLock).toHaveBeenCalledWith('slot:eq-1:C3', 'cui-1');
    });

    it('blocks when lock is not acquired (race condition)', async () => {
        (acquireSlotLock as ReturnType<typeof vi.fn>).mockResolvedValue(false);

        await handleEscolhaSlot(makeMsg('C1'), baseState);

        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('já está sendo selecionado');
    });

    it('blocks when slot already confirmed in DB', async () => {
        (prisma.alocacao.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'existing' });

        await handleEscolhaSlot(makeMsg('C1'), baseState);

        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('já foi preenchido');
    });

    it('creates allocation with correct turno for C1 (MANHA)', async () => {
        await handleEscolhaSlot(makeMsg('C1'), baseState);

        expect(prisma.alocacao.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                slotId: 'C1',
                turno: 'MANHA',
                cuidadorId: 'cui-1',
                pacienteId: 'pac-1',
                status: 'CONFIRMADO',
            }),
        });
    });

    it('creates allocation with NOITE turno for C5', async () => {
        await handleEscolhaSlot(makeMsg('C5'), baseState);

        expect(prisma.alocacao.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                slotId: 'C5',
                turno: 'NOITE',
            }),
        });
    });

    it('resets state to IDLE after successful choice', async () => {
        await handleEscolhaSlot(makeMsg('C1'), baseState);

        expect(setUserState).toHaveBeenCalledWith(
            '5511999990000@s.whatsapp.net',
            expect.objectContaining({
                currentFlow: 'IDLE',
            }),
        );
    });

    it('shows patient name in confirmation message', async () => {
        await handleEscolhaSlot(makeMsg('C2'), baseState);

        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('Dona Maria');
    });

    it('handles DB error gracefully', async () => {
        (prisma.alocacao.create as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB down'));

        await handleEscolhaSlot(makeMsg('C1'), baseState);

        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('erro');
    });

    it('handles slots C1-C8 range only', async () => {
        await handleEscolhaSlot(makeMsg('C9'), baseState);

        const msg = (sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(msg).toContain('Formato inválido');
    });
});
