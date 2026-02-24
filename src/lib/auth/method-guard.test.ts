import { describe, it, expect } from 'vitest';
import { isWriteBlocked, guardWriteMethod } from './method-guard';

describe('isWriteBlocked', () => {
    it('returns true for LEITURA role with POST', () => {
        expect(isWriteBlocked('LEITURA', 'POST')).toBe(true);
    });

    it('returns true for LEITURA role with PUT', () => {
        expect(isWriteBlocked('LEITURA', 'PUT')).toBe(true);
    });

    it('returns true for LEITURA role with PATCH', () => {
        expect(isWriteBlocked('LEITURA', 'PATCH')).toBe(true);
    });

    it('returns true for LEITURA role with DELETE', () => {
        expect(isWriteBlocked('LEITURA', 'DELETE')).toBe(true);
    });

    it('returns false for LEITURA role with GET', () => {
        expect(isWriteBlocked('LEITURA', 'GET')).toBe(false);
    });

    it('returns false for ADMIN role with POST', () => {
        expect(isWriteBlocked('ADMIN', 'POST')).toBe(false);
    });

    it('returns false for ADMIN role with DELETE', () => {
        expect(isWriteBlocked('ADMIN', 'DELETE')).toBe(false);
    });

    it('returns false for OPERADOR role with POST', () => {
        expect(isWriteBlocked('OPERADOR', 'POST')).toBe(false);
    });

    it('returns false for SUPERVISOR role with PUT', () => {
        expect(isWriteBlocked('SUPERVISOR', 'PUT')).toBe(false);
    });

    it('handles case-insensitive method strings', () => {
        expect(isWriteBlocked('LEITURA', 'post')).toBe(true);
        expect(isWriteBlocked('LEITURA', 'get')).toBe(false);
    });
});

describe('guardWriteMethod', () => {
    it('throws {code: "FORBIDDEN"} for LEITURA with DELETE', () => {
        expect(() => guardWriteMethod('LEITURA', 'DELETE')).toThrow();
        try {
            guardWriteMethod('LEITURA', 'DELETE');
        } catch (err: any) {
            expect(err.code).toBe('FORBIDDEN');
            expect(err.message).toBeDefined();
        }
    });

    it('throws {code: "FORBIDDEN"} for LEITURA with POST', () => {
        expect(() => guardWriteMethod('LEITURA', 'POST')).toThrow();
    });

    it('does not throw for ADMIN with DELETE', () => {
        expect(() => guardWriteMethod('ADMIN', 'DELETE')).not.toThrow();
    });

    it('does not throw for ADMIN with POST', () => {
        expect(() => guardWriteMethod('ADMIN', 'POST')).not.toThrow();
    });

    it('does not throw for LEITURA with GET', () => {
        expect(() => guardWriteMethod('LEITURA', 'GET')).not.toThrow();
    });

    it('does not throw for OPERADOR with PATCH', () => {
        expect(() => guardWriteMethod('OPERADOR', 'PATCH')).not.toThrow();
    });
});
