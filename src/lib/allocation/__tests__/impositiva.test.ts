import { describe, it, expect } from 'vitest';
import { executarAlocacaoImpositiva, gerarMensagemAlocacao } from '../impositiva';
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
        modoAlocacao: 'IMPOSITIVA',
        status: 'MONTANDO',
    };
}

interface Cuidador {
    id: string;
    nome: string;
    telefone: string;
    disponibilidade: {
        turno: 'MANHA' | 'TARDE' | 'NOITE';
        diasSemana: number[];
    }[];
    score?: number;
}

function makeCuidador(overrides: Partial<Cuidador> = {}): Cuidador {
    return {
        id: 'cuid-1',
        nome: 'Maria',
        telefone: '5511999999999',
        disponibilidade: [{ turno: 'MANHA', diasSemana: [1, 2, 3, 4, 5] }],
        score: 5,
        ...overrides,
    };
}

describe('executarAlocacaoImpositiva', () => {
    it('allocates highest-scored cuidador first', async () => {
        const equipe = makeEquipe([
            makeSlot({ id: 'C1', turno: 'MANHA', diaSemana: 1 }),
        ]);

        const cuidadores = [
            makeCuidador({ id: 'cuid-low', nome: 'Low', score: 3 }),
            makeCuidador({ id: 'cuid-high', nome: 'High', score: 9 }),
        ];

        const results = await executarAlocacaoImpositiva(equipe, cuidadores);

        expect(results).toHaveLength(1);
        expect(results[0].cuidadorId).toBe('cuid-high');
        expect(results[0].slotId).toBe('C1');
        expect(results[0].status).toBe('PENDENTE_FEEDBACK');
    });

    it('skips cuidador with no matching availability', async () => {
        const equipe = makeEquipe([
            makeSlot({ id: 'C1', turno: 'NOITE', diaSemana: 6 }),
        ]);

        const cuidadores = [
            makeCuidador({
                id: 'cuid-manha-only',
                score: 10,
                disponibilidade: [{ turno: 'MANHA', diasSemana: [1, 2, 3] }],
            }),
            makeCuidador({
                id: 'cuid-noite',
                score: 5,
                disponibilidade: [{ turno: 'NOITE', diasSemana: [6] }],
            }),
        ];

        const results = await executarAlocacaoImpositiva(equipe, cuidadores);

        expect(results).toHaveLength(1);
        expect(results[0].cuidadorId).toBe('cuid-noite');
    });

    it('does not double-allocate same cuidador', async () => {
        const equipe = makeEquipe([
            makeSlot({ id: 'C1', turno: 'MANHA', diaSemana: 1 }),
            makeSlot({ id: 'C2', turno: 'MANHA', diaSemana: 2 }),
        ]);

        const cuidadores = [
            makeCuidador({ id: 'cuid-1', score: 10, disponibilidade: [{ turno: 'MANHA', diasSemana: [1, 2] }] }),
            makeCuidador({ id: 'cuid-2', score: 5, disponibilidade: [{ turno: 'MANHA', diasSemana: [1, 2] }] }),
        ];

        const results = await executarAlocacaoImpositiva(equipe, cuidadores);

        expect(results).toHaveLength(2);
        const allocatedIds = results.map(r => r.cuidadorId);
        // Each cuidador appears at most once
        expect(new Set(allocatedIds).size).toBe(2);
        // Highest score gets first slot
        expect(results[0].cuidadorId).toBe('cuid-1');
        expect(results[1].cuidadorId).toBe('cuid-2');
    });

    it('returns empty when no cuidadores available', async () => {
        const equipe = makeEquipe([
            makeSlot({ id: 'C1', turno: 'NOITE', diaSemana: 0 }),
        ]);

        const results = await executarAlocacaoImpositiva(equipe, []);

        expect(results).toEqual([]);
    });
});

describe('gerarMensagemAlocacao', () => {
    it('includes all provided info in the message', () => {
        const msg = gerarMensagemAlocacao('João Santos', 'C3', 'NOITE', {
            nome: 'Dona Ana',
            endereco: 'Rua das Flores, 123',
        });

        expect(msg).toContain('João Santos');
        expect(msg).toContain('C3');
        expect(msg).toContain('NOITE');
        expect(msg).toContain('Dona Ana');
        expect(msg).toContain('Rua das Flores, 123');
    });
});
