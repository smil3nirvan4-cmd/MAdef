import { describe, it, expect } from 'vitest';
import { calcularKATZ } from './katz';
import type { KATZEvaluation } from '../../types/evaluation';

function createKatzEvaluation(
    overrides: Partial<KATZEvaluation> = {},
): KATZEvaluation {
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

describe('Katz Scale Evaluation', () => {
    describe('Full independence (score 6, classification A)', () => {
        it('all independent yields score 6 and classification A', () => {
            const resultado = calcularKATZ(createKatzEvaluation());

            expect(resultado.pontuacao).toBe(6);
            expect(resultado.classificacao).toBe('A');
            expect(resultado.descricao).toContain('Independente em todas');
            expect(resultado.atividadesDependentes).toEqual([]);
        });
    });

    describe('Full dependence (score 0, classification G)', () => {
        it('all dependent yields score 0 and classification G', () => {
            const resultado = calcularKATZ(createKatzEvaluation({
                banho: 'dependente',
                vestir: 'dependente',
                higiene: 'dependente',
                transferencia: 'dependente',
                continencia: 'dependente',
                alimentacao: 'dependente',
            }));

            expect(resultado.pontuacao).toBe(0);
            expect(resultado.classificacao).toBe('G');
            expect(resultado.descricao).toContain('Dependente em todas');
            expect(resultado.atividadesDependentes).toHaveLength(6);
            expect(resultado.atividadesDependentes).toContain('Banho');
            expect(resultado.atividadesDependentes).toContain('Vestir');
            expect(resultado.atividadesDependentes).toContain('Higiene');
            expect(resultado.atividadesDependentes).toContain('Transferência');
            expect(resultado.atividadesDependentes).toContain('Continência');
            expect(resultado.atividadesDependentes).toContain('Alimentação');
        });
    });

    describe('Each classification level', () => {
        it('score 5 yields classification B', () => {
            const resultado = calcularKATZ(createKatzEvaluation({
                banho: 'dependente',
            }));

            expect(resultado.pontuacao).toBe(5);
            expect(resultado.classificacao).toBe('B');
            expect(resultado.atividadesDependentes).toEqual(['Banho']);
        });

        it('score 4 yields classification C', () => {
            const resultado = calcularKATZ(createKatzEvaluation({
                banho: 'dependente',
                vestir: 'dependente',
            }));

            expect(resultado.pontuacao).toBe(4);
            expect(resultado.classificacao).toBe('C');
            expect(resultado.atividadesDependentes).toHaveLength(2);
        });

        it('score 3 yields classification D', () => {
            const resultado = calcularKATZ(createKatzEvaluation({
                banho: 'dependente',
                vestir: 'dependente',
                higiene: 'dependente',
            }));

            expect(resultado.pontuacao).toBe(3);
            expect(resultado.classificacao).toBe('D');
            expect(resultado.atividadesDependentes).toHaveLength(3);
        });

        it('score 2 yields classification E', () => {
            const resultado = calcularKATZ(createKatzEvaluation({
                banho: 'dependente',
                vestir: 'dependente',
                higiene: 'dependente',
                transferencia: 'dependente',
            }));

            expect(resultado.pontuacao).toBe(2);
            expect(resultado.classificacao).toBe('E');
            expect(resultado.atividadesDependentes).toHaveLength(4);
        });

        it('score 1 yields classification F', () => {
            const resultado = calcularKATZ(createKatzEvaluation({
                banho: 'dependente',
                vestir: 'dependente',
                higiene: 'dependente',
                transferencia: 'dependente',
                continencia: 'dependente',
            }));

            expect(resultado.pontuacao).toBe(1);
            expect(resultado.classificacao).toBe('F');
            expect(resultado.atividadesDependentes).toHaveLength(5);
        });
    });

    describe('Parcial values behavior', () => {
        it('parcial is treated as neither independente nor dependente', () => {
            const resultado = calcularKATZ(createKatzEvaluation({
                banho: 'parcial',
            }));

            // parcial is not 'independente' so it reduces score
            expect(resultado.pontuacao).toBe(5);
            // parcial is not 'dependente' so it is NOT in atividadesDependentes
            expect(resultado.atividadesDependentes).not.toContain('Banho');
        });

        it('all parcial yields score 0 and no dependentes list', () => {
            const resultado = calcularKATZ(createKatzEvaluation({
                banho: 'parcial',
                vestir: 'parcial',
                higiene: 'parcial',
                transferencia: 'parcial',
                continencia: 'parcial',
                alimentacao: 'parcial',
            }));

            expect(resultado.pontuacao).toBe(0);
            expect(resultado.classificacao).toBe('G');
            // All are parcial, not 'dependente', so list is empty
            expect(resultado.atividadesDependentes).toEqual([]);
        });

        it('mix of parcial and dependente', () => {
            const resultado = calcularKATZ(createKatzEvaluation({
                banho: 'parcial',
                vestir: 'dependente',
                higiene: 'parcial',
                transferencia: 'dependente',
            }));

            // 2 independente (continencia, alimentacao) => score 2
            expect(resultado.pontuacao).toBe(2);
            expect(resultado.classificacao).toBe('E');
            // Only 'dependente' items are listed
            expect(resultado.atividadesDependentes).toEqual(['Vestir', 'Transferência']);
        });
    });

    describe('Individual activity dependence', () => {
        it('only alimentacao dependente', () => {
            const resultado = calcularKATZ(createKatzEvaluation({
                alimentacao: 'dependente',
            }));

            expect(resultado.pontuacao).toBe(5);
            expect(resultado.classificacao).toBe('B');
            expect(resultado.atividadesDependentes).toEqual(['Alimentação']);
        });

        it('only continencia dependente', () => {
            const resultado = calcularKATZ(createKatzEvaluation({
                continencia: 'dependente',
            }));

            expect(resultado.pontuacao).toBe(5);
            expect(resultado.atividadesDependentes).toEqual(['Continência']);
        });

        it('only transferencia dependente', () => {
            const resultado = calcularKATZ(createKatzEvaluation({
                transferencia: 'dependente',
            }));

            expect(resultado.pontuacao).toBe(5);
            expect(resultado.atividadesDependentes).toEqual(['Transferência']);
        });
    });

    describe('Description text', () => {
        it('classification B description mentions 5 independent and 1 dependent', () => {
            const resultado = calcularKATZ(createKatzEvaluation({
                banho: 'dependente',
            }));

            expect(resultado.descricao).toContain('5');
            expect(resultado.descricao).toContain('1');
        });

        it('classification D description mentions 3 independent and 3 dependent', () => {
            const resultado = calcularKATZ(createKatzEvaluation({
                banho: 'dependente',
                vestir: 'dependente',
                higiene: 'dependente',
            }));

            expect(resultado.descricao).toContain('3');
        });
    });
});
