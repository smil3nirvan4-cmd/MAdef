import { describe, expect, it } from 'vitest';
import {
    autoCorrectBrazilianPhone,
    normalizeOutboundPhoneBR,
    toE164BR,
    toJid,
    validateBrazilianPhone,
} from '@/lib/phone-validator';

describe('phone-validator', () => {
    it('normalizes brazilian mobile to e164 and jid', () => {
        expect(toE164BR('(11) 98556-8208')).toBe('5511985568208');
        expect(toJid('(11) 98556-8208')).toBe('5511985568208@s.whatsapp.net');
    });

    it('auto-corrects truncated mobile by adding missing 9th digit', () => {
        // 4591233799 → DDD 45 + 91233799 (8 digits starting with 9) → 45991233799
        const result = validateBrazilianPhone('4591233799');
        expect(result.isValid).toBe(true);
        expect(result.type).toBe('celular');
        expect(result.formatted).toBe('(45) 99123-3799');
        expect(result.whatsapp).toBe('5545991233799');
    });

    it('auto-corrects with country code prefix', () => {
        const result = validateBrazilianPhone('554591233799');
        expect(result.isValid).toBe(true);
        expect(result.whatsapp).toBe('5545991233799');
    });

    it('autoCorrectBrazilianPhone returns corrected number', () => {
        const result = autoCorrectBrazilianPhone('4591233799');
        expect(result.wasCorrected).toBe(true);
        expect(result.corrected).toBe('45991233799');
    });

    it('autoCorrectBrazilianPhone does not modify valid numbers', () => {
        const result = autoCorrectBrazilianPhone('45991233799');
        expect(result.wasCorrected).toBe(false);
        expect(result.corrected).toBe('45991233799');
    });

    it('does not auto-correct landline numbers', () => {
        // DDD 45 + 32221234 (8 digits starting with 3) → landline, no correction
        const result = validateBrazilianPhone('4532221234');
        expect(result.isValid).toBe(true);
        expect(result.type).toBe('fixo');
    });

    it('normalizes outbound target to canonical @s.whatsapp.net jid', () => {
        const normalized = normalizeOutboundPhoneBR('11 98556-8208');
        expect(normalized.isValid).toBe(true);
        expect(normalized.e164).toBe('5511985568208');
        expect(normalized.jid).toBe('5511985568208@s.whatsapp.net');
    });

    it('normalizeOutbound auto-corrects truncated mobile', () => {
        const normalized = normalizeOutboundPhoneBR('4591233799');
        expect(normalized.isValid).toBe(true);
        expect(normalized.e164).toBe('5545991233799');
    });

    it('rejects non-phone @lid ids for outbound', () => {
        const normalized = normalizeOutboundPhoneBR('226065603686505@lid');
        expect(normalized.isValid).toBe(false);
    });
});
