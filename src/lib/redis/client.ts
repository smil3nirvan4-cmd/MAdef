import Redis from 'ioredis';

let redis: Redis | null = null;

/**
 * Get the Redis client singleton. Returns null if Redis is not configured
 * or unavailable (graceful degradation).
 */
export function getRedis(): Redis | null {
    if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
        return null;
    }

    if (!redis) {
        try {
            redis = new Redis(process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`, {
                maxRetriesPerRequest: 1,
                lazyConnect: true,
                connectTimeout: 3000,
                retryStrategy(times) {
                    if (times > 3) return null; // Stop retrying after 3 attempts
                    return Math.min(times * 200, 1000);
                },
            });
            redis.on('error', () => {
                // Silently handle connection errors — getRedis() will return null on next call
                redis?.disconnect();
                redis = null;
            });
        } catch {
            return null;
        }
    }

    return redis;
}

/**
 * Disconnect Redis (for graceful shutdown).
 */
export async function disconnectRedis(): Promise<void> {
    if (redis) {
        await redis.quit().catch(() => {});
        redis = null;
    }
}
