// ============================================
// BRAZILIAN PHONE VALIDATOR
// ============================================

export interface PhoneValidationResult {
    isValid: boolean;
    formatted: string;      // Display format: (11) 99999-9999
    whatsapp: string;       // WhatsApp format: 5511999999999
    jid: string;            // JID format: 5511999999999@s.whatsapp.net
    type: 'celular' | 'fixo' | 'invalido';
    ddd: string;
    number: string;
    error?: string;
}

export interface OutboundPhoneNormalization {
    isValid: boolean;
    e164: string;
    jid: string;
    formatted: string;
    type: 'celular' | 'fixo' | 'invalido';
    error?: string;
}

const VALID_DDDS = [
    '11', '12', '13', '14', '15', '16', '17', '18', '19',
    '21', '22', '24', '27', '28',
    '31', '32', '33', '34', '35', '37', '38',
    '41', '42', '43', '44', '45', '46', '47', '48', '49',
    '51', '53', '54', '55',
    '61', '62', '63', '64', '65', '66', '67', '68', '69',
    '71', '73', '74', '75', '77', '79',
    '81', '82', '83', '84', '85', '86', '87', '88', '89',
    '91', '92', '93', '94', '95', '96', '97', '98', '99',
];

/**
 * Validate and normalize Brazilian phone number.
 */
export function validateBrazilianPhone(input: string): PhoneValidationResult {
    const digitsOnly = String(input ?? '').replace(/\D/g, '');

    const invalidResult: PhoneValidationResult = {
        isValid: false,
        formatted: '',
        whatsapp: '',
        jid: '',
        type: 'invalido',
        ddd: '',
        number: '',
        error: '',
    };

    if (digitsOnly.length < 10) {
        return { ...invalidResult, error: 'Numero muito curto. Informe DDD + numero' };
    }

    if (digitsOnly.length > 13) {
        return { ...invalidResult, error: 'Numero muito longo' };
    }

    let normalizedNumber = digitsOnly;

    // Remove country code if present.
    if (normalizedNumber.startsWith('55') && normalizedNumber.length >= 12) {
        normalizedNumber = normalizedNumber.slice(2);
    }

    if (normalizedNumber.length < 10 || normalizedNumber.length > 11) {
        return { ...invalidResult, error: 'Formato invalido. Use: DDD + numero' };
    }

    const ddd = normalizedNumber.slice(0, 2);
    const number = normalizedNumber.slice(2);

    if (!VALID_DDDS.includes(ddd)) {
        return { ...invalidResult, error: `DDD ${ddd} invalido`, ddd };
    }

    let type: 'celular' | 'fixo' | 'invalido';

    if (number.length === 9) {
        if (!number.startsWith('9')) {
            return { ...invalidResult, error: 'Celular com 9 digitos deve comecar com 9', ddd, number };
        }
        type = 'celular';
    } else if (number.length === 8) {
        const firstDigit = number.charAt(0);
        if (['2', '3', '4', '5'].includes(firstDigit)) {
            type = 'fixo';
        } else if (firstDigit === '9') {
            // Prevent accepting truncated mobile numbers.
            return { ...invalidResult, error: 'Celular deve ter 9 digitos apos o DDD', ddd, number };
        } else {
            return { ...invalidResult, error: 'Numero fixo deve comecar com 2, 3, 4 ou 5', ddd, number };
        }
    } else {
        return { ...invalidResult, error: 'Numero deve ter 8 ou 9 digitos apos o DDD', ddd, number };
    }

    const fullNumber = `55${ddd}${number}`;

    let formatted: string;
    if (number.length === 9) {
        formatted = `(${ddd}) ${number.slice(0, 5)}-${number.slice(5)}`;
    } else {
        formatted = `(${ddd}) ${number.slice(0, 4)}-${number.slice(4)}`;
    }

    return {
        isValid: true,
        formatted,
        whatsapp: fullNumber,
        jid: `${fullNumber}@s.whatsapp.net`,
        type,
        ddd,
        number,
    };
}

function sanitizePhoneInput(raw: string): string {
    if (!raw) return '';

    const trimmed = String(raw)
        .trim()
        .replace(/^whatsapp:/i, '')
        .replace(/^tel:/i, '');

    return trimmed.includes('@') ? trimmed.split('@')[0] : trimmed;
}

export function toE164BR(raw: string): string {
    const cleaned = sanitizePhoneInput(raw);
    if (!cleaned) return '';

    const validation = validateBrazilianPhone(cleaned);
    return validation.isValid ? validation.whatsapp : '';
}

export function toJid(raw: string): string {
    const e164 = toE164BR(raw);
    return e164 ? `${e164}@s.whatsapp.net` : '';
}

export function normalizeOutboundPhoneBR(raw: string): OutboundPhoneNormalization {
    const cleaned = sanitizePhoneInput(raw);
    const validation = validateBrazilianPhone(cleaned);

    if (!validation.isValid) {
        return {
            isValid: false,
            e164: '',
            jid: '',
            formatted: '',
            type: 'invalido',
            error: validation.error || 'Telefone invalido',
        };
    }

    return {
        isValid: true,
        e164: validation.whatsapp,
        jid: `${validation.whatsapp}@s.whatsapp.net`,
        formatted: validation.formatted,
        type: validation.type,
    };
}

export function formatPhoneDisplay(input: string): string {
    const result = validateBrazilianPhone(input);
    return result.isValid ? result.formatted : input;
}

export function formatPhoneWhatsApp(input: string): string {
    const result = validateBrazilianPhone(input);
    return result.isValid ? result.whatsapp : '';
}

export function formatPhoneJID(input: string): string {
    const result = validateBrazilianPhone(input);
    return result.isValid ? result.jid : '';
}

export function isMobileNumber(input: string): boolean {
    const result = validateBrazilianPhone(input);
    return result.isValid && result.type === 'celular';
}

export default {
    validate: validateBrazilianPhone,
    formatDisplay: formatPhoneDisplay,
    formatWhatsApp: formatPhoneWhatsApp,
    formatJID: formatPhoneJID,
    isMobile: isMobileNumber,
    toE164BR,
    toJid,
    normalizeOutboundPhoneBR,
};
