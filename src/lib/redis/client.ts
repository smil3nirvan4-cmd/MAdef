import Redis from 'ioredis';
import logger from '@/lib/observability/logger';

let instance: Redis | null = null;
let initialized = false;

function createRedis(): Redis | null {
    const url = process.env.REDIS_URL;
    if (!url) return null;

    try {
        const redis = new Redis(url, {
            maxRetriesPerRequest: 3,
            retryStrategy(times) {
                if (times > 5) return null;
                return Math.min(times * 200, 2000);
            },
            lazyConnect: true,
            enableReadyCheck: true,
            connectTimeout: 5000,
        });

        redis.on('error', (err) => {
            logger.warning('redis.connection', 'Connection error', { module: 'redis-client', errorMessage: err.message });
        });

        redis.on('connect', () => {
            logger.info('redis.connection', 'Connected', { module: 'redis-client' });
        });

        return redis;
    } catch {
        logger.warning('redis.init', 'Failed to create client', { module: 'redis-client' });
        return null;
    }
}

export async function getRedis(): Promise<Redis | null> {
    if (initialized) return instance;
    initialized = true;

    instance = createRedis();
    if (!instance) return null;

    try {
        await instance.connect();
        return instance;
    } catch {
        logger.warning('redis.connection', 'Failed to connect, running without L2 cache', { module: 'redis-client' });
        instance = null;
        return null;
    }
}

export async function closeRedis(): Promise<void> {
    if (instance) {
        await instance.quit();
        instance = null;
        initialized = false;
    }
}

/** For testing: reset singleton state */
export function _resetForTest(): void {
    instance = null;
    initialized = false;
}
