function clamp(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, value));
}

export function parsePagination(url: URL): { page: number; pageSize: number } {
    const page = clamp(Number(url.searchParams.get('page') || '1'), 1, 1_000_000);
    const pageSize = clamp(Number(url.searchParams.get('pageSize') || url.searchParams.get('limit') || '20'), 1, 100);
    return { page, pageSize };
}

export function parseSort(
    url: URL,
    allowedFields: string[],
    defaultField = 'createdAt',
    defaultDir: 'asc' | 'desc' = 'desc'
): { field: string; direction: 'asc' | 'desc' } {
    const legacyField = url.searchParams.get('sortBy') || '';
    const legacyDir = String(url.searchParams.get('sortDir') || '').toLowerCase();

    const raw = String(url.searchParams.get('sort') || '').trim();
    const [rawField, rawDirection] = raw.split(':');

    const candidateField = rawField || legacyField || defaultField;
    const field = allowedFields.includes(candidateField) ? candidateField : defaultField;

    const dirRaw = String(rawDirection || legacyDir || defaultDir).toLowerCase();
    const direction: 'asc' | 'desc' = dirRaw === 'asc' ? 'asc' : 'desc';

    return { field, direction };
}

export function parseFilter(
    url: URL,
    allowedFields: string[]
): Partial<Record<string, string>> {
    const raw = String(url.searchParams.get('filter') || '').trim();
    if (!raw) return {};

    const result: Partial<Record<string, string>> = {};
    for (const chunk of raw.split(',')) {
        const [rawField, ...rawValueParts] = chunk.split(':');
        const field = String(rawField || '').trim();
        const value = rawValueParts.join(':').trim();

        if (!field || !value) continue;
        if (!allowedFields.includes(field)) continue;

        result[field] = value;
    }

    return result;
}
