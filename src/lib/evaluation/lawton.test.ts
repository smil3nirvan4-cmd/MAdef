import { describe, it, expect } from 'vitest';
import { calcularLawton, type LawtonResult } from './lawton';
import type { LawtonEvaluation } from '@/types/evaluation';

function makeEval(score: 1 | 2 | 3): LawtonEvaluation {
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

describe('calcularLawton', () => {
    it('maximum independence (all 3) → 24, INDEPENDENTE', () => {
        const result = calcularLawton(makeEval(3));
        expect(result.pontuacao).toBe(24);
        expect(result.nivel).toBe('INDEPENDENTE');
        expect(result.descricao).toContain('Independente');
    });

    it('all scores 1 → 8, DEPENDENCIA_SEVERA', () => {
        const result = calcularLawton(makeEval(1));
        expect(result.pontuacao).toBe(8);
        expect(result.nivel).toBe('DEPENDENCIA_SEVERA');
        expect(result.descricao).toContain('severa');
    });

    it('all scores 2 → 16, DEPENDENCIA_PARCIAL', () => {
        const result = calcularLawton(makeEval(2));
        expect(result.pontuacao).toBe(16);
        expect(result.nivel).toBe('DEPENDENCIA_PARCIAL');
        expect(result.descricao).toContain('parcial');
    });

    it('score exactly 20 → INDEPENDENTE', () => {
        const eval20: LawtonEvaluation = {
            telefone: 3,
            compras: 3,
            cozinhar: 3,
            tarefasDomesticas: 3,
            lavanderia: 2,
            transporte: 2,
            medicacao: 2,
            financas: 2,
        };
        const result = calcularLawton(eval20);
        expect(result.pontuacao).toBe(20);
        expect(result.nivel).toBe('INDEPENDENTE');
    });

    it('score exactly 13 → DEPENDENCIA_PARCIAL', () => {
        const eval13: LawtonEvaluation = {
            telefone: 2,
            compras: 2,
            cozinhar: 2,
            tarefasDomesticas: 2,
            lavanderia: 1,
            transporte: 1,
            medicacao: 2,
            financas: 1,
        };
        const result = calcularLawton(eval13);
        expect(result.pontuacao).toBe(13);
        expect(result.nivel).toBe('DEPENDENCIA_PARCIAL');
    });

    it('score 12 → DEPENDENCIA_SEVERA', () => {
        const eval12: LawtonEvaluation = {
            telefone: 2,
            compras: 2,
            cozinhar: 2,
            tarefasDomesticas: 2,
            lavanderia: 1,
            transporte: 1,
            medicacao: 1,
            financas: 1,
        };
        const result = calcularLawton(eval12);
        expect(result.pontuacao).toBe(12);
        expect(result.nivel).toBe('DEPENDENCIA_SEVERA');
    });

    it('mixed scores produce correct sum', () => {
        const evalMixed: LawtonEvaluation = {
            telefone: 3,
            compras: 1,
            cozinhar: 2,
            tarefasDomesticas: 3,
            lavanderia: 1,
            transporte: 2,
            medicacao: 3,
            financas: 1,
        };
        const result = calcularLawton(evalMixed);
        expect(result.pontuacao).toBe(16); // 3+1+2+3+1+2+3+1 = 16
        expect(result.nivel).toBe('DEPENDENCIA_PARCIAL');
    });

    it('score exactly 19 → DEPENDENCIA_PARCIAL', () => {
        const eval19: LawtonEvaluation = {
            telefone: 3,
            compras: 3,
            cozinhar: 3,
            tarefasDomesticas: 3,
            lavanderia: 2,
            transporte: 2,
            medicacao: 2,
            financas: 1,
        };
        const result = calcularLawton(eval19);
        expect(result.pontuacao).toBe(19);
        expect(result.nivel).toBe('DEPENDENCIA_PARCIAL');
    });
});
