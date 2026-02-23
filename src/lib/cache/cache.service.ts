import { getRedis } from '@/lib/redis/client';

// L1: In-memory cache (per-instance, hot path)
const l1Cache = new Map<string, { value: string; expiresAt: number }>();
const L1_MAX_SIZE = 500;

function l1Get(key: string): string | undefined {
    const entry = l1Cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
        l1Cache.delete(key);
        return undefined;
    }
    return entry.value;
}

function l1Set(key: string, value: string, ttlMs: number): void {
    if (l1Cache.size >= L1_MAX_SIZE) {
        // Evict oldest entry
        const oldest = l1Cache.keys().next().value;
        if (oldest) l1Cache.delete(oldest);
    }
    l1Cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/**
 * Two-level cache: L1 (in-memory) → L2 (Redis) → fetcher (DB).
 * Falls back gracefully if Redis is unavailable.
 */
export async function cached<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds: number = 60,
): Promise<T> {
    const cacheKey = `cache:${key}`;

    // L1 check
    const l1 = l1Get(cacheKey);
    if (l1 !== undefined) {
        return JSON.parse(l1) as T;
    }

    // L2 check (Redis)
    try {
        const redis = getRedis();
        const l2 = await redis.get(cacheKey);
        if (l2 !== null) {
            l1Set(cacheKey, l2, ttlSeconds * 1000);
            return JSON.parse(l2) as T;
        }
    } catch {
        // Redis unavailable — fall through to fetcher
    }

    // Fetch from source
    const result = await fetcher();
    const serialized = JSON.stringify(result);

    // Set L1
    l1Set(cacheKey, serialized, ttlSeconds * 1000);

    // Set L2 (fire and forget)
    try {
        const redis = getRedis();
        await redis.setex(cacheKey, ttlSeconds, serialized);
    } catch {
        // Redis unavailable — L1 still works
    }

    return result;
}

/**
 * Invalidate cache entries matching a pattern.
 */
export async function invalidate(pattern: string): Promise<void> {
    // L1: clear matching entries
    for (const key of l1Cache.keys()) {
        if (key.includes(pattern)) {
            l1Cache.delete(key);
        }
    }

    // L2: scan and delete matching keys
    try {
        const redis = getRedis();
        const keys = await redis.keys(`cache:*${pattern}*`);
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    } catch {
        // Redis unavailable
    }
}

/**
 * Clear all cache entries.
 */
export async function clearAll(): Promise<void> {
    l1Cache.clear();
    try {
        const redis = getRedis();
        const keys = await redis.keys('cache:*');
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    } catch {
        // Redis unavailable
    }
}
