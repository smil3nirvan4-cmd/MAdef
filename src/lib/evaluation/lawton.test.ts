import { describe, it, expect } from 'vitest';
import { calcularLawton } from './lawton';
import type { LawtonEvaluation } from '../../types/evaluation';

function createLawtonEvaluation(
    overrides: Partial<LawtonEvaluation> = {},
): LawtonEvaluation {
    return {
        telefone: 3,
        compras: 3,
        cozinhar: 3,
        tarefasDomesticas: 3,
        lavanderia: 3,
        transporte: 3,
        medicacao: 3,
        financas: 3,
        ...overrides,
    };
}

function createUniformEvaluation(score: 1 | 2 | 3): LawtonEvaluation {
    return {
        telefone: score,
        compras: score,
        cozinhar: score,
        tarefasDomesticas: score,
        lavanderia: score,
        transporte: score,
        medicacao: score,
        financas: score,
    };
}

describe('Lawton Scale Evaluation', () => {
    describe('Maximum independence (score 24)', () => {
        it('all items at 3 yields score 24 and INDEPENDENTE', () => {
            const resultado = calcularLawton(createLawtonEvaluation());

            expect(resultado.pontuacao).toBe(24);
            expect(resultado.nivel).toBe('INDEPENDENTE');
            expect(resultado.descricao).toContain('Independente');
        });
    });

    describe('Maximum dependence (score 8)', () => {
        it('all items at 1 yields score 8 and DEPENDENCIA_SEVERA', () => {
            const resultado = calcularLawton(createUniformEvaluation(1));

            expect(resultado.pontuacao).toBe(8);
            expect(resultado.nivel).toBe('DEPENDENCIA_SEVERA');
            expect(resultado.descricao).toContain('severa');
        });
    });

    describe('Partial dependence (score 13-19)', () => {
        it('all items at 2 yields score 16 and DEPENDENCIA_PARCIAL', () => {
            const resultado = calcularLawton(createUniformEvaluation(2));

            expect(resultado.pontuacao).toBe(16);
            expect(resultado.nivel).toBe('DEPENDENCIA_PARCIAL');
            expect(resultado.descricao).toContain('parcial');
        });
    });

    describe('Boundary conditions', () => {
        it('score exactly 20 is INDEPENDENTE (lower boundary)', () => {
            // 4 items at 3 (12) + 4 items at 2 (8) = 20
            const resultado = calcularLawton(createLawtonEvaluation({
                telefone: 2,
                compras: 2,
                cozinhar: 2,
                tarefasDomesticas: 2,
            }));

            expect(resultado.pontuacao).toBe(20);
            expect(resultado.nivel).toBe('INDEPENDENTE');
        });

        it('score exactly 19 is DEPENDENCIA_PARCIAL (upper boundary)', () => {
            // 3 items at 3 (9) + 5 items at 2 (10) = 19
            const resultado = calcularLawton(createLawtonEvaluation({
                telefone: 2,
                compras: 2,
                cozinhar: 2,
                tarefasDomesticas: 2,
                lavanderia: 2,
            }));

            expect(resultado.pontuacao).toBe(19);
            expect(resultado.nivel).toBe('DEPENDENCIA_PARCIAL');
        });

        it('score exactly 13 is DEPENDENCIA_PARCIAL (lower boundary)', () => {
            // 5 items at 1 (5) + 3 items at 3 minus 1 => need total 13
            // 1 item at 3 (3) + 2 items at 2 (4) + 5 items at 1 (5) = 12 -- not enough
            // 3 items at 2 (6) + 5 items at 1 (5) = 11 -- not enough
            // Try: 5 items at 1 (5) + 1 item at 2 (2) + 2 items at 3 (6) = 13
            const resultado = calcularLawton({
                telefone: 1,
                compras: 1,
                cozinhar: 1,
                tarefasDomesticas: 1,
                lavanderia: 1,
                transporte: 2,
                medicacao: 3,
                financas: 3,
            });

            expect(resultado.pontuacao).toBe(13);
            expect(resultado.nivel).toBe('DEPENDENCIA_PARCIAL');
        });

        it('score exactly 12 is DEPENDENCIA_SEVERA (upper boundary)', () => {
            // 4 items at 1 (4) + 4 items at 2 (8) = 12
            const resultado = calcularLawton({
                telefone: 1,
                compras: 1,
                cozinhar: 1,
                tarefasDomesticas: 1,
                lavanderia: 2,
                transporte: 2,
                medicacao: 2,
                financas: 2,
            });

            expect(resultado.pontuacao).toBe(12);
            expect(resultado.nivel).toBe('DEPENDENCIA_SEVERA');
        });
    });

    describe('Individual activity variations', () => {
        it('single item at minimum (1) with rest at max (3) gives score 22', () => {
            const resultado = calcularLawton(createLawtonEvaluation({
                telefone: 1,
            }));

            expect(resultado.pontuacao).toBe(22);
            expect(resultado.nivel).toBe('INDEPENDENTE');
        });

        it('single item at mid (2) with rest at max (3) gives score 23', () => {
            const resultado = calcularLawton(createLawtonEvaluation({
                financas: 2,
            }));

            expect(resultado.pontuacao).toBe(23);
            expect(resultado.nivel).toBe('INDEPENDENTE');
        });
    });

    describe('Mixed scores', () => {
        it('alternating 1 and 3 values yields correct sum', () => {
            const resultado = calcularLawton({
                telefone: 1,
                compras: 3,
                cozinhar: 1,
                tarefasDomesticas: 3,
                lavanderia: 1,
                transporte: 3,
                medicacao: 1,
                financas: 3,
            });

            expect(resultado.pontuacao).toBe(16);
            expect(resultado.nivel).toBe('DEPENDENCIA_PARCIAL');
        });

        it('gradual decrease from high to low', () => {
            const resultado = calcularLawton({
                telefone: 3,
                compras: 3,
                cozinhar: 3,
                tarefasDomesticas: 2,
                lavanderia: 2,
                transporte: 2,
                medicacao: 1,
                financas: 1,
            });

            // 9 + 6 + 2 = 17
            expect(resultado.pontuacao).toBe(17);
            expect(resultado.nivel).toBe('DEPENDENCIA_PARCIAL');
        });
    });

    describe('Return structure', () => {
        it('returns pontuacao, nivel, and descricao', () => {
            const resultado = calcularLawton(createLawtonEvaluation());

            expect(resultado).toHaveProperty('pontuacao');
            expect(resultado).toHaveProperty('nivel');
            expect(resultado).toHaveProperty('descricao');
            expect(typeof resultado.pontuacao).toBe('number');
            expect(typeof resultado.nivel).toBe('string');
            expect(typeof resultado.descricao).toBe('string');
        });

        it('nivel is always one of the three valid values', () => {
            const validNiveis = ['INDEPENDENTE', 'DEPENDENCIA_PARCIAL', 'DEPENDENCIA_SEVERA'];

            // Test all three boundaries
            for (const score of [1, 2, 3] as const) {
                const resultado = calcularLawton(createUniformEvaluation(score));
                expect(validNiveis).toContain(resultado.nivel);
            }
        });
    });
});
