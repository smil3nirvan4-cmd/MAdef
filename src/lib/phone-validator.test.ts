import { describe, expect, it } from 'vitest';
import {
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

    it('rejects truncated mobile number with only 8 digits after DDD', () => {
        const result = validateBrazilianPhone('551198556801');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Celular deve ter 9 digitos');
    });

    it('normalizes outbound target to canonical @s.whatsapp.net jid', () => {
        const normalized = normalizeOutboundPhoneBR('11 98556-8208');
        expect(normalized.isValid).toBe(true);
        expect(normalized.e164).toBe('5511985568208');
        expect(normalized.jid).toBe('5511985568208@s.whatsapp.net');
    });

    it('rejects non-phone @lid ids for outbound', () => {
        const normalized = normalizeOutboundPhoneBR('226065603686505@lid');
        expect(normalized.isValid).toBe(false);
    });
});
