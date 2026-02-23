import Redis from 'ioredis';

let redis: Redis | null = null;

export function getRedis(): Redis {
    if (!redis) {
        redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
            maxRetriesPerRequest: null, // Required by BullMQ
            lazyConnect: true,
        });

        redis.on('error', (err) => {
            console.error('[Redis] Connection error:', err.message);
        });

        redis.on('connect', () => {
            console.info('[Redis] Connected');
        });
    }
    return redis;
}

export async function closeRedis(): Promise<void> {
    if (redis) {
        await redis.quit();
        redis = null;
    }
}
