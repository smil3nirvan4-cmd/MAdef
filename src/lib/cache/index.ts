interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export async function cached<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds = 30,
): Promise<T> {
    const now = Date.now();
    const existing = store.get(key);

    if (existing && existing.expiresAt > now) {
        return existing.value as T;
    }

    const value = await fetcher();
    store.set(key, { value, expiresAt: now + ttlSeconds * 1000 });
    return value;
}

export function invalidate(prefix: string): void {
    for (const key of store.keys()) {
        if (key.startsWith(prefix)) {
            store.delete(key);
        }
    }
}

export function clearCache(): void {
    store.clear();
}
