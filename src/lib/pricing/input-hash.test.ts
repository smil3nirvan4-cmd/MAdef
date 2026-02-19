import { describe, expect, it } from 'vitest';
import { computeInputHash } from './input-hash';

describe('input-hash', () => {
    it('gera hash deterministico com ordem de chaves diferente', () => {
        const a = { b: 2, a: 1, nested: { y: 2, x: 1 } };
        const b = { a: 1, nested: { x: 1, y: 2 }, b: 2 };

        expect(computeInputHash(a)).toBe(computeInputHash(b));
    });

    it('ignora campos volateis', () => {
        const base = {
            unidadeId: 'u1',
            finalPrice: 1000,
            requestId: 'abc',
            timestamp: '2026-02-18T20:00:00-03:00',
        };
        const changedVolatile = {
            unidadeId: 'u1',
            finalPrice: 1000,
            requestId: 'xyz',
            timestamp: '2026-02-18T21:00:00-03:00',
        };

        expect(computeInputHash(base)).toBe(computeInputHash(changedVolatile));
    });

    it('normaliza datas em string ISO', () => {
        const a = { date: '2026-02-18T20:00:00-03:00' };
        const b = { date: '2026-02-18T23:00:00.000Z' };

        expect(computeInputHash(a)).toBe(computeInputHash(b));
    });

    it('detecta alteracao relevante', () => {
        const a = { finalPrice: 1000, breakdown: { margem: 200 } };
        const b = { finalPrice: 1001, breakdown: { margem: 200 } };

        expect(computeInputHash(a)).not.toBe(computeInputHash(b));
    });
});
