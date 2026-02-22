// ============================================
// INPUT MASKS & VALIDATION UTILITIES
// Brazilian document and field formatting
// ============================================

/**
 * Format CPF: 000.000.000-00
 */
export function maskCPF(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/**
 * Validate CPF using check digits algorithm.
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
 * Format phone: (00) 00000-0000 or (00) 0000-0000
 */
export function maskPhone(value: string): string {
    let digits = value.replace(/\D/g, '');
    // Remove country code prefix
    if (digits.startsWith('55') && digits.length > 11) {
        digits = digits.slice(2);
    }
    digits = digits.slice(0, 11);

    if (digits.length === 0) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Extract raw digits from a masked value.
 */
export function unmask(value: string): string {
    return value.replace(/\D/g, '');
}

/**
 * Format currency in BRL: R$ 1.234,56
 */
export function maskCurrency(value: string | number): string {
    const numericValue = typeof value === 'number'
        ? value
        : parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.'));

    if (isNaN(numericValue)) return 'R$ 0,00';

    return numericValue.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
}

/**
 * Format weight: accepts only numbers and one decimal point
 */
export function maskWeight(value: string): string {
    const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.');
    const parts = cleaned.split('.');
    if (parts.length > 2) return `${parts[0]}.${parts[1]}`;
    return cleaned;
}

/**
 * Format height: accepts numbers like 1.75 or 1,75
 */
export function maskHeight(value: string): string {
    const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.');
    const parts = cleaned.split('.');
    if (parts.length > 2) return `${parts[0]}.${parts[1]}`;
    if (parts[1] && parts[1].length > 2) return `${parts[0]}.${parts[1].slice(0, 2)}`;
    return cleaned;
}
