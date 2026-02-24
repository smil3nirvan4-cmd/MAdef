import { describe, it, expect } from 'vitest';
import { calcularLawton } from './lawton';
import type { LawtonEvaluation } from '@/types/evaluation';

function makeEval(value: 1 | 2 | 3): LawtonEvaluation {
    return {
        telefone: value,
        compras: value,
        cozinhar: value,
        tarefasDomesticas: value,
        lavanderia: value,
        transporte: value,
        medicacao: value,
        financas: value,
    };
}

function makeEvalWithOverrides(
    base: 1 | 2 | 3,
    overrides: Partial<LawtonEvaluation> = {},
): LawtonEvaluation {
    return { ...makeEval(base), ...overrides };
}

describe('calcularLawton', () => {
    describe('boundary: maximum score (all 3s = 24)', () => {
        it('returns INDEPENDENTE with pontuacao 24', () => {
            const result = calcularLawton(makeEval(3));
            expect(result.pontuacao).toBe(24);
            expect(result.nivel).toBe('INDEPENDENTE');
            expect(result.descricao).toBe('Independente para atividades instrumentais');
        });
    });

    describe('boundary: minimum score (all 1s = 8)', () => {
        it('returns DEPENDENCIA_SEVERA with pontuacao 8', () => {
            const result = calcularLawton(makeEval(1));
            expect(result.pontuacao).toBe(8);
            expect(result.nivel).toBe('DEPENDENCIA_SEVERA');
            expect(result.descricao).toBe('Dependência severa para atividades instrumentais');
        });
    });

    describe('boundary: threshold at 20 (INDEPENDENTE cutoff)', () => {
        it('pontuacao 20 is INDEPENDENTE', () => {
            // 6 activities at 3 (18) + 2 at 1 (2) = 20
            const avaliacao = makeEvalWithOverrides(3, {
                telefone: 1,
                compras: 1,
            });
            const result = calcularLawton(avaliacao);
            expect(result.pontuacao).toBe(20);
            expect(result.nivel).toBe('INDEPENDENTE');
        });

        it('pontuacao 19 is DEPENDENCIA_PARCIAL', () => {
            // 5 activities at 3 (15) + 2 at 1 (2) + 1 at 2 (2) = 19
            const avaliacao = makeEvalWithOverrides(3, {
                telefone: 1,
                compras: 1,
                cozinhar: 2,
            });
            const result = calcularLawton(avaliacao);
            expect(result.pontuacao).toBe(19);
            expect(result.nivel).toBe('DEPENDENCIA_PARCIAL');
        });
    });

    describe('boundary: threshold at 13 (DEPENDENCIA_PARCIAL cutoff)', () => {
        it('pontuacao 13 is DEPENDENCIA_PARCIAL', () => {
            // 5 activities at 1 (5) + 3 at 2 (6) + need 2 more => adjust
            // Let's target 13 exactly: 5 at 1 = 5, 3 at 2 = 6 => 11... need 13
            // 3 at 1 = 3, 5 at 2 = 10 => 13
            const avaliacao: LawtonEvaluation = {
                telefone: 1,
                compras: 1,
                cozinhar: 1,
                tarefasDomesticas: 2,
                lavanderia: 2,
                transporte: 2,
                medicacao: 2,
                financas: 2,
            };
            const result = calcularLawton(avaliacao);
            expect(result.pontuacao).toBe(13);
            expect(result.nivel).toBe('DEPENDENCIA_PARCIAL');
        });

        it('pontuacao 12 is DEPENDENCIA_SEVERA', () => {
            // 4 at 1 = 4, 4 at 2 = 8 => 12
            const avaliacao: LawtonEvaluation = {
                telefone: 1,
                compras: 1,
                cozinhar: 1,
                tarefasDomesticas: 1,
                lavanderia: 2,
                transporte: 2,
                medicacao: 2,
                financas: 2,
            };
            const result = calcularLawton(avaliacao);
            expect(result.pontuacao).toBe(12);
            expect(result.nivel).toBe('DEPENDENCIA_SEVERA');
        });
    });

    describe('middle score (all 2s = 16)', () => {
        it('returns DEPENDENCIA_PARCIAL with pontuacao 16', () => {
            const result = calcularLawton(makeEval(2));
            expect(result.pontuacao).toBe(16);
            expect(result.nivel).toBe('DEPENDENCIA_PARCIAL');
            expect(result.descricao).toBe('Dependência parcial para atividades instrumentais');
        });
    });

    describe('mixed values', () => {
        it('correctly sums mixed values', () => {
            const avaliacao: LawtonEvaluation = {
                telefone: 3,
                compras: 2,
                cozinhar: 1,
                tarefasDomesticas: 3,
                lavanderia: 2,
                transporte: 1,
                medicacao: 3,
                financas: 2,
            };
            // 3+2+1+3+2+1+3+2 = 17
            const result = calcularLawton(avaliacao);
            expect(result.pontuacao).toBe(17);
            expect(result.nivel).toBe('DEPENDENCIA_PARCIAL');
        });

        it('correctly sums to INDEPENDENTE with mixed high values', () => {
            const avaliacao: LawtonEvaluation = {
                telefone: 3,
                compras: 3,
                cozinhar: 3,
                tarefasDomesticas: 3,
                lavanderia: 3,
                transporte: 2,
                medicacao: 2,
                financas: 3,
            };
            // 3+3+3+3+3+2+2+3 = 22
            const result = calcularLawton(avaliacao);
            expect(result.pontuacao).toBe(22);
            expect(result.nivel).toBe('INDEPENDENTE');
        });
    });

    describe('return structure', () => {
        it('returns an object with pontuacao, nivel, and descricao', () => {
            const result = calcularLawton(makeEval(2));
            expect(result).toHaveProperty('pontuacao');
            expect(result).toHaveProperty('nivel');
            expect(result).toHaveProperty('descricao');
            expect(typeof result.pontuacao).toBe('number');
            expect(typeof result.nivel).toBe('string');
            expect(typeof result.descricao).toBe('string');
        });
    });
});
