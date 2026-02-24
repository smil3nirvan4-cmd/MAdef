import { describe, it, expect, beforeEach } from 'vitest';
import {
    inicializarSlotsParaEscolha,
    processarEscolha,
    gerarMensagemEscolha,
} from '../escolha';
import type { Equipe, Slot } from '../slots';

function makeSlot(overrides: Partial<Slot> = {}): Slot {
    return {
        id: 'C1',
        equipeId: 'eq-1',
        turno: 'MANHA',
        diaSemana: 1,
        status: 'DISPONIVEL',
        dataInicio: new Date('2026-03-01T00:00:00Z'),
        dataFim: new Date('2026-03-31T00:00:00Z'),
        ...overrides,
    };
}

function makeEquipe(slots: Slot[]): Equipe {
    return {
        id: 'eq-1',
        pacienteId: 'pac-1',
        duracaoDias: 30,
        horasDiarias: 24,
        slots,
        modoAlocacao: 'ESCOLHA',
        status: 'MONTANDO',
    };
}

describe('inicializarSlotsParaEscolha', () => {
    it('returns slots with descriptions', () => {
        const equipe = makeEquipe([
            makeSlot({ id: 'C1', turno: 'MANHA', diaSemana: 1 }),
            makeSlot({ id: 'C2', turno: 'NOITE', diaSemana: 3 }),
        ]);

        const result = inicializarSlotsParaEscolha(equipe);

        expect(result).toHaveLength(2);
        expect(result[0]).toHaveProperty('descricao');
        expect(result[0].descricao).toContain('C1');
        expect(result[0].descricao).toContain('MANHA');
        expect(result[0].descricao).toContain('Segunda');
        expect(result[1].descricao).toContain('C2');
        expect(result[1].descricao).toContain('NOITE');
        expect(result[1].descricao).toContain('Quarta');
    });
});

describe('processarEscolha', () => {
    beforeEach(() => {
        // Re-initialize to reset in-memory state between tests
        const equipe = makeEquipe([
            makeSlot({ id: 'C1', turno: 'MANHA', diaSemana: 1, status: 'DISPONIVEL' }),
            makeSlot({ id: 'C2', turno: 'NOITE', diaSemana: 3, status: 'DISPONIVEL' }),
        ]);
        inicializarSlotsParaEscolha(equipe);
    });

    it('succeeds for an available slot', () => {
        const result = processarEscolha('eq-1', 'C1', 'cuid-1');

        expect(result.success).toBe(true);
        expect(result.slotId).toBe('C1');
        expect(result.message).toContain('C1');
    });

    it('fails for a non-existent slot', () => {
        const result = processarEscolha('eq-1', 'C99', 'cuid-1');

        expect(result.success).toBe(false);
        expect(result.message).toContain('C99');
        expect(result.message).toContain('não encontrado');
    });

    it('fails for an already-taken slot', () => {
        // First cuidador takes C1
        processarEscolha('eq-1', 'C1', 'cuid-1');

        // Second cuidador tries same slot
        const result = processarEscolha('eq-1', 'C1', 'cuid-2');

        expect(result.success).toBe(false);
        expect(result.message).toContain('já foi escolhido');
        expect(result.slotsRestantes).toBeDefined();
        expect(result.slotsRestantes!.every(s => s.status === 'DISPONIVEL')).toBe(true);
    });
});

describe('gerarMensagemEscolha', () => {
    it('includes the cuidador name', () => {
        const slots = inicializarSlotsParaEscolha(
            makeEquipe([makeSlot({ id: 'C1', turno: 'MANHA', diaSemana: 1 })])
        );

        const msg = gerarMensagemEscolha('Maria Silva', slots);

        expect(msg).toContain('Maria Silva');
    });

    it('lists available slots in the message', () => {
        const equipe = makeEquipe([
            makeSlot({ id: 'C1', turno: 'MANHA', diaSemana: 1, status: 'DISPONIVEL' }),
            makeSlot({ id: 'C2', turno: 'NOITE', diaSemana: 5, status: 'DISPONIVEL' }),
        ]);
        const slots = inicializarSlotsParaEscolha(equipe);

        const msg = gerarMensagemEscolha('Ana', slots);

        expect(msg).toContain('C1');
        expect(msg).toContain('MANHA');
        expect(msg).toContain('C2');
        expect(msg).toContain('NOITE');
    });
});
