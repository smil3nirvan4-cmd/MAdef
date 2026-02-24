import { getRedis } from '@/lib/redis/client';

/** L1 in-memory cache */
const memoryCache = new Map<string, { data: unknown; expiresAt: number }>();

/**
 * Two-level cache: L1 (memory) → L2 (Redis) → fetcher (DB).
 * Falls back gracefully if Redis is unavailable.
 */
export async function cached<T>(key: string, fetcher: () => Promise<T>, ttlSec = 60): Promise<T> {
    // L1: memory
    const mem = memoryCache.get(key);
    if (mem && mem.expiresAt > Date.now()) {
        return mem.data as T;
    }

    // L2: Redis
    const redis = getRedis();
    if (redis) {
        try {
            const val = await redis.get(`cache:${key}`);
            if (val) {
                const parsed = JSON.parse(val) as T;
                memoryCache.set(key, { data: parsed, expiresAt: Date.now() + ttlSec * 1000 });
                return parsed;
            }
        } catch {
            // Fallback to fetcher
        }
    }

    // L3: DB/fetcher
    const data = await fetcher();
    memoryCache.set(key, { data, expiresAt: Date.now() + ttlSec * 1000 });
    if (redis) {
        try {
            await redis.setex(`cache:${key}`, ttlSec, JSON.stringify(data));
        } catch {
            // Ignore Redis write errors
        }
    }
    return data;
}

/**
 * Invalidate cache entries matching a prefix.
 */
export async function invalidate(prefix: string): Promise<void> {
    // Clear L1
    for (const key of memoryCache.keys()) {
        if (key.startsWith(prefix)) memoryCache.delete(key);
    }

    // Clear L2
    const redis = getRedis();
    if (redis) {
        try {
            const keys = await redis.keys(`cache:${prefix}*`);
            if (keys.length) await redis.del(...keys);
        } catch {
            // Ignore
        }
    }
}

/**
 * Clear the entire L1 memory cache (useful for tests).
 */
export function __clearMemoryCache(): void {
    memoryCache.clear();
}
