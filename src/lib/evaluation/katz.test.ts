import { describe, it, expect } from 'vitest';
import { calcularKATZ } from './katz';
import type { KATZEvaluation } from '@/types/evaluation';

function makeEval(overrides: Partial<KATZEvaluation> = {}): KATZEvaluation {
    return {
        banho: 'independente',
        vestir: 'independente',
        higiene: 'independente',
        transferencia: 'independente',
        continencia: 'independente',
        alimentacao: 'independente',
        ...overrides,
    };
}

describe('calcularKATZ', () => {
    describe('boundary: all independent (score 6)', () => {
        it('returns classificacao A with pontuacao 6', () => {
            const result = calcularKATZ(makeEval());
            expect(result.pontuacao).toBe(6);
            expect(result.classificacao).toBe('A');
            expect(result.descricao).toBe('Independente em todas as atividades');
            expect(result.atividadesDependentes).toEqual([]);
        });
    });

    describe('boundary: all dependent (score 0)', () => {
        it('returns classificacao G with pontuacao 0', () => {
            const avaliacao: KATZEvaluation = {
                banho: 'dependente',
                vestir: 'dependente',
                higiene: 'dependente',
                transferencia: 'dependente',
                continencia: 'dependente',
                alimentacao: 'dependente',
            };
            const result = calcularKATZ(avaliacao);
            expect(result.pontuacao).toBe(0);
            expect(result.classificacao).toBe('G');
            expect(result.descricao).toBe('Dependente em todas as atividades');
            expect(result.atividadesDependentes).toEqual([
                'Banho', 'Vestir', 'Higiene', 'Transferência', 'Continência', 'Alimentação',
            ]);
        });
    });

    describe('score 5 — one dependent', () => {
        it('returns classificacao B when banho is dependente', () => {
            const result = calcularKATZ(makeEval({ banho: 'dependente' }));
            expect(result.pontuacao).toBe(5);
            expect(result.classificacao).toBe('B');
            expect(result.descricao).toBe('Independente em 5 atividades, dependente em 1');
            expect(result.atividadesDependentes).toEqual(['Banho']);
        });
    });

    describe('score 4 — two dependent', () => {
        it('returns classificacao C', () => {
            const result = calcularKATZ(makeEval({
                banho: 'dependente',
                vestir: 'dependente',
            }));
            expect(result.pontuacao).toBe(4);
            expect(result.classificacao).toBe('C');
            expect(result.descricao).toBe('Independente em 4 atividades, dependente em 2');
            expect(result.atividadesDependentes).toEqual(['Banho', 'Vestir']);
        });
    });

    describe('score 3 — three dependent', () => {
        it('returns classificacao D', () => {
            const result = calcularKATZ(makeEval({
                banho: 'dependente',
                vestir: 'dependente',
                higiene: 'dependente',
            }));
            expect(result.pontuacao).toBe(3);
            expect(result.classificacao).toBe('D');
            expect(result.descricao).toBe('Independente em 3 atividades, dependente em 3');
            expect(result.atividadesDependentes).toEqual(['Banho', 'Vestir', 'Higiene']);
        });
    });

    describe('score 2 — four dependent', () => {
        it('returns classificacao E', () => {
            const result = calcularKATZ(makeEval({
                banho: 'dependente',
                vestir: 'dependente',
                higiene: 'dependente',
                transferencia: 'dependente',
            }));
            expect(result.pontuacao).toBe(2);
            expect(result.classificacao).toBe('E');
            expect(result.descricao).toBe('Independente em 2 atividades, dependente em 4');
            expect(result.atividadesDependentes).toEqual([
                'Banho', 'Vestir', 'Higiene', 'Transferência',
            ]);
        });
    });

    describe('score 1 — five dependent', () => {
        it('returns classificacao F', () => {
            const result = calcularKATZ(makeEval({
                banho: 'dependente',
                vestir: 'dependente',
                higiene: 'dependente',
                transferencia: 'dependente',
                continencia: 'dependente',
            }));
            expect(result.pontuacao).toBe(1);
            expect(result.classificacao).toBe('F');
            expect(result.descricao).toBe('Independente em 1 atividade, dependente em 5');
            expect(result.atividadesDependentes).toEqual([
                'Banho', 'Vestir', 'Higiene', 'Transferência', 'Continência',
            ]);
        });
    });

    describe('parcial values are treated as non-independent', () => {
        it('parcial counts toward dependent activities', () => {
            const result = calcularKATZ(makeEval({ banho: 'parcial' }));
            // parcial is neither 'independente' nor 'dependente',
            // so it won't be counted as independent (pontuacao goes down)
            // but also won't appear in atividadesDependentes (filtered by 'dependente')
            expect(result.pontuacao).toBe(5);
            expect(result.classificacao).toBe('B');
            expect(result.atividadesDependentes).toEqual([]);
        });

        it('all parcial yields pontuacao 0 with no dependentes listed', () => {
            const avaliacao: KATZEvaluation = {
                banho: 'parcial',
                vestir: 'parcial',
                higiene: 'parcial',
                transferencia: 'parcial',
                continencia: 'parcial',
                alimentacao: 'parcial',
            };
            const result = calcularKATZ(avaliacao);
            expect(result.pontuacao).toBe(0);
            expect(result.classificacao).toBe('G');
            expect(result.atividadesDependentes).toEqual([]);
        });
    });

    describe('mixed independente and dependente across different activities', () => {
        it('correctly identifies dependent activities regardless of position', () => {
            const result = calcularKATZ(makeEval({
                vestir: 'dependente',
                continencia: 'dependente',
            }));
            expect(result.pontuacao).toBe(4);
            expect(result.classificacao).toBe('C');
            expect(result.atividadesDependentes).toEqual(['Vestir', 'Continência']);
        });
    });

    describe('complete classification mapping', () => {
        const cases: Array<{ score: number; classificacao: string }> = [
            { score: 6, classificacao: 'A' },
            { score: 5, classificacao: 'B' },
            { score: 4, classificacao: 'C' },
            { score: 3, classificacao: 'D' },
            { score: 2, classificacao: 'E' },
            { score: 1, classificacao: 'F' },
            { score: 0, classificacao: 'G' },
        ];

        const activities: (keyof KATZEvaluation)[] = [
            'banho', 'vestir', 'higiene', 'transferencia', 'continencia', 'alimentacao',
        ];

        it.each(cases)('score $score maps to classificacao $classificacao', ({ score, classificacao }) => {
            const overrides: Partial<KATZEvaluation> = {};
            // Make (6 - score) activities dependente
            for (let i = 0; i < 6 - score; i++) {
                overrides[activities[i]] = 'dependente';
            }
            const result = calcularKATZ(makeEval(overrides));
            expect(result.classificacao).toBe(classificacao);
        });
    });
});
