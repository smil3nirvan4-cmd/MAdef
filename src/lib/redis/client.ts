import Redis from 'ioredis';

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
            console.warn('[Redis] Connection error:', err.message);
        });

        redis.on('connect', () => {
            console.log('[Redis] Connected');
        });

        return redis;
    } catch {
        console.warn('[Redis] Failed to create client');
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
        console.warn('[Redis] Failed to connect, running without L2 cache');
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
