import { getRedis } from '@/lib/redis/client';

interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

async function getFromL2<T>(key: string): Promise<T | undefined> {
    try {
        const redis = await getRedis();
        if (!redis) return undefined;
        const raw = await redis.get(`cache:${key}`);
        if (!raw) return undefined;
        return JSON.parse(raw) as T;
    } catch {
        return undefined;
    }
}

async function setInL2<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
        const redis = await getRedis();
        if (!redis) return;
        await redis.set(`cache:${key}`, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
        // L2 write failure is non-critical
    }
}

async function invalidateL2(prefix: string): Promise<void> {
    try {
        const redis = await getRedis();
        if (!redis) return;
        const keys = await redis.keys(`cache:${prefix}*`);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    } catch {
        // L2 invalidation failure is non-critical
    }
}

export async function cached<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds = 30,
): Promise<T> {
    const now = Date.now();

    // L1: in-memory
    const existing = store.get(key);
    if (existing && existing.expiresAt > now) {
        return existing.value as T;
    }

    // L2: Redis
    const fromL2 = await getFromL2<T>(key);
    if (fromL2 !== undefined) {
        store.set(key, { value: fromL2, expiresAt: now + ttlSeconds * 1000 });
        return fromL2;
    }

    // Fetch from source
    const value = await fetcher();
    store.set(key, { value, expiresAt: now + ttlSeconds * 1000 });
    await setInL2(key, value, ttlSeconds);
    return value;
}

export function invalidate(prefix: string): void {
    for (const key of store.keys()) {
        if (key.startsWith(prefix)) {
            store.delete(key);
        }
    }
    invalidateL2(prefix);
}

export function clearCache(): void {
    store.clear();
}
