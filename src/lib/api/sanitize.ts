/**
 * Input sanitization utilities to prevent XSS and injection attacks.
 * Applied at API boundaries before data enters business logic.
 */

const HTML_ENTITIES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
};

const HTML_REGEX = /[&<>"']/g;

export function escapeHtml(input: string): string {
    return input.replace(HTML_REGEX, (char) => HTML_ENTITIES[char] || char);
}

export function stripHtmlTags(input: string): string {
    return input.replace(/<[^>]*>/g, '');
}

export function sanitizeString(input: string): string {
    return stripHtmlTags(input).trim();
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
    const result = { ...obj };
    for (const [key, value] of Object.entries(result)) {
        if (typeof value === 'string') {
            (result as Record<string, unknown>)[key] = sanitizeString(value);
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            (result as Record<string, unknown>)[key] = sanitizeObject(
                value as Record<string, unknown>
            );
        }
    }
    return result;
}

export function sanitizePhone(phone: string): string {
    return phone.replace(/[^\d+]/g, '');
}
