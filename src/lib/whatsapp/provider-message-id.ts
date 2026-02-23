function get(obj: Record<string, unknown>, path: string[]): unknown {
    let current: unknown = obj;
    for (const key of path) {
        if (!current || typeof current !== 'object') return undefined;
        current = (current as Record<string, unknown>)[key];
    }
    return current;
}

export function extractProviderMessageId(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') return null;

    const source = payload as Record<string, unknown>;
    const candidates = [
        get(source, ['providerMessageId']),
        get(source, ['messageId']),
        get(source, ['id']),
        get(source, ['key', 'id']),
        get(source, ['data', 'key', 'id']),
        get(source, ['message', 'key', 'id']),
        get(source, ['messages', '0', 'key', 'id']),
        get(source, ['result', 'key', 'id']),
    ];

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) {
            return candidate.trim();
        }
    }

    return null;
}

