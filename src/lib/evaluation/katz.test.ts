import { describe, it, expect } from 'vitest';
import { calcularKATZ, type KATZResult } from './katz';
import type { KATZEvaluation } from '@/types/evaluation';

function allIndependent(): KATZEvaluation {
    return {
        banho: 'independente',
        vestir: 'independente',
        higiene: 'independente',
        transferencia: 'independente',
        continencia: 'independente',
        alimentacao: 'independente',
    };
}

function allDependent(): KATZEvaluation {
    return {
        banho: 'dependente',
        vestir: 'dependente',
        higiene: 'dependente',
        transferencia: 'dependente',
        continencia: 'dependente',
        alimentacao: 'dependente',
    };
}

describe('calcularKATZ', () => {
    it('all independent → score 6, classification A', () => {
        const result = calcularKATZ(allIndependent());
        expect(result.pontuacao).toBe(6);
        expect(result.classificacao).toBe('A');
        expect(result.descricao).toContain('Independente em todas');
        expect(result.atividadesDependentes).toEqual([]);
    });

    it('all dependent → score 0, classification G', () => {
        const result = calcularKATZ(allDependent());
        expect(result.pontuacao).toBe(0);
        expect(result.classificacao).toBe('G');
        expect(result.descricao).toContain('Dependente em todas');
        expect(result.atividadesDependentes).toHaveLength(6);
    });

    it('5 independent, 1 dependent → score 5, classification B', () => {
        const eval5 = { ...allIndependent(), banho: 'dependente' as const };
        const result = calcularKATZ(eval5);
        expect(result.pontuacao).toBe(5);
        expect(result.classificacao).toBe('B');
        expect(result.atividadesDependentes).toEqual(['Banho']);
    });

    it('4 independent → score 4, classification C', () => {
        const eval4 = {
            ...allIndependent(),
            banho: 'dependente' as const,
            vestir: 'dependente' as const,
        };
        const result = calcularKATZ(eval4);
        expect(result.pontuacao).toBe(4);
        expect(result.classificacao).toBe('C');
    });

    it('3 independent → score 3, classification D', () => {
        const eval3 = {
            ...allDependent(),
            higiene: 'independente' as const,
            transferencia: 'independente' as const,
            continencia: 'independente' as const,
        };
        const result = calcularKATZ(eval3);
        expect(result.pontuacao).toBe(3);
        expect(result.classificacao).toBe('D');
    });

    it('2 independent → score 2, classification E', () => {
        const eval2 = {
            ...allDependent(),
            alimentacao: 'independente' as const,
            continencia: 'independente' as const,
        };
        const result = calcularKATZ(eval2);
        expect(result.pontuacao).toBe(2);
        expect(result.classificacao).toBe('E');
    });

    it('1 independent → score 1, classification F', () => {
        const eval1 = { ...allDependent(), alimentacao: 'independente' as const };
        const result = calcularKATZ(eval1);
        expect(result.pontuacao).toBe(1);
        expect(result.classificacao).toBe('F');
    });

    it('parcial counts as dependent', () => {
        const evalParcial: KATZEvaluation = {
            banho: 'parcial',
            vestir: 'parcial',
            higiene: 'parcial',
            transferencia: 'parcial',
            continencia: 'parcial',
            alimentacao: 'parcial',
        };
        const result = calcularKATZ(evalParcial);
        expect(result.pontuacao).toBe(0);
        expect(result.classificacao).toBe('G');
    });

    it('lists dependent activities by name', () => {
        const eval3 = {
            ...allIndependent(),
            banho: 'dependente' as const,
            vestir: 'dependente' as const,
            higiene: 'dependente' as const,
        };
        const result = calcularKATZ(eval3);
        expect(result.atividadesDependentes).toEqual(['Banho', 'Vestir', 'Higiene']);
    });
});
