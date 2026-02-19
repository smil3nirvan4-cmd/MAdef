import { createHash } from 'crypto';

const VOLATILE_KEYS = new Set([
    'requestId',
    'timestamp',
    'createdAt',
    'updatedAt',
    'recalculatedAt',
    'durationMs',
]);

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function normalizeDateString(value: string): string {
    if (ISO_DATE_RE.test(value)) return value;
    if (!ISO_DATETIME_RE.test(value)) return value;

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toISOString();
}

function normalize(value: unknown): unknown {
    if (value instanceof Date) {
        return value.toISOString();
    }

    if (typeof value === 'string') {
        return normalizeDateString(value);
    }

    if (Array.isArray(value)) {
        return value.map((item) => normalize(item));
    }

    if (value && typeof value === 'object') {
        const entries = Object.entries(value as Record<string, unknown>)
            .filter(([key, item]) => !VOLATILE_KEYS.has(key) && item !== undefined)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, item]) => [key, normalize(item)]);
        return Object.fromEntries(entries);
    }

    return value;
}

export function stableStringify(value: unknown): string {
    return JSON.stringify(normalize(value));
}

export function computeInputHash(value: unknown): string {
    return createHash('sha256').update(stableStringify(value)).digest('hex');
}
