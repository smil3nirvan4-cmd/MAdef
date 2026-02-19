import { describe, expect, it } from 'vitest';
import { CAPABILITIES, getCapabilities, hasCapability } from './roles';
import { isWriteBlocked } from './method-guard';

describe('capability matrix', () => {
    it('ADMIN has all capabilities', () => {
        for (const capability of CAPABILITIES) {
            expect(hasCapability('ADMIN', capability)).toBe(true);
        }
    });

    it('LEITURA cannot SEND_PROPOSTA', () => {
        expect(hasCapability('LEITURA', 'SEND_PROPOSTA')).toBe(false);
    });

    it('LEITURA can VIEW_WHATSAPP', () => {
        expect(hasCapability('LEITURA', 'VIEW_WHATSAPP')).toBe(true);
    });

    it('FINANCEIRO can SEND_CONTRATO', () => {
        expect(hasCapability('FINANCEIRO', 'SEND_CONTRATO')).toBe(true);
    });

    it('OPERADOR cannot SEND_CONTRATO', () => {
        expect(hasCapability('OPERADOR', 'SEND_CONTRATO')).toBe(false);
    });

    it('SUPERVISOR can RETRY_QUEUE_ITEM', () => {
        expect(hasCapability('SUPERVISOR', 'RETRY_QUEUE_ITEM')).toBe(true);
    });

    it('write method blocking respects LEITURA role', () => {
        expect(isWriteBlocked('LEITURA', 'POST')).toBe(true);
        expect(isWriteBlocked('LEITURA', 'GET')).toBe(false);
        expect(isWriteBlocked('OPERADOR', 'POST')).toBe(false);
    });

    it('ADMIN capability list matches CAPABILITIES size', () => {
        expect(getCapabilities('ADMIN').length).toBe(CAPABILITIES.length);
    });
});
