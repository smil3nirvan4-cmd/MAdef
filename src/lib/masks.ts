// ============================================
// INPUT MASKS & FORMATTERS (Brazilian Standards)
// ============================================

/**
 * CPF mask: 000.000.000-00
 */
export function maskCPF(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/**
 * Validate CPF checksum.
 */
export function validateCPF(cpf: string): boolean {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return false;

    // Reject known invalid patterns (all same digit)
    if (/^(\d)\1{10}$/.test(digits)) return false;

    // First check digit
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(digits.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10) remainder = 0;
    if (remainder !== parseInt(digits.charAt(9))) return false;

    // Second check digit
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(digits.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10) remainder = 0;
    if (remainder !== parseInt(digits.charAt(10))) return false;

    return true;
}

/**
 * Phone mask: (00) 00000-0000 or (00) 0000-0000
 */
export function maskPhone(value: string): string {
    const digits = value.replace(/\D/g, '');
    let clean = digits;
    if (clean.startsWith('55') && clean.length > 11) {
        clean = clean.slice(2);
    }
    clean = clean.slice(0, 11);

    if (clean.length === 0) return '';
    if (clean.length <= 2) return `(${clean}`;
    if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
    if (clean.length <= 10) {
        return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    }
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
}

/**
 * CEP mask: 00000-000
 */
export function maskCEP(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/**
 * Currency mask (BRL): R$ 1.234,56
 */
export function maskCurrency(value: string): string {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';

    const numericValue = parseInt(digits) / 100;
    return numericValue.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
}

/**
 * Weight mask: accepts decimal with comma (e.g., 75,5)
 * Allows up to 3 integer digits and 1 decimal
 */
export function maskWeight(value: string): string {
    // Allow digits and comma/period
    const cleaned = value.replace(/[^\d.,]/g, '');
    // Normalize to use comma
    const normalized = cleaned.replace('.', ',');
    // Only allow one comma
    const parts = normalized.split(',');
    if (parts.length > 2) return `${parts[0]},${parts[1]}`;
    // Limit integer part to 3 digits and decimal to 1 digit
    const integer = parts[0].slice(0, 3);
    if (parts.length === 2) {
        return `${integer},${parts[1].slice(0, 1)}`;
    }
    return integer;
}

/**
 * Height mask: accepts 0,00 format (meters)
 * Allows 1 integer digit and up to 2 decimals
 */
export function maskHeight(value: string): string {
    const cleaned = value.replace(/[^\d.,]/g, '');
    const normalized = cleaned.replace('.', ',');
    const parts = normalized.split(',');
    if (parts.length > 2) return `${parts[0]},${parts[1]}`;
    const integer = parts[0].slice(0, 1);
    if (parts.length === 2) {
        return `${integer},${parts[1].slice(0, 2)}`;
    }
    return integer;
}

/**
 * Only digits mask
 */
export function maskDigitsOnly(value: string, maxLength?: number): string {
    const digits = value.replace(/\D/g, '');
    return maxLength ? digits.slice(0, maxLength) : digits;
}

/**
 * Extract raw digits from any masked value
 */
export function unmask(value: string): string {
    return value.replace(/\D/g, '');
}
