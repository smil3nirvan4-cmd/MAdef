import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/redis/client', () => ({
    getRedis: vi.fn().mockReturnValue(null),
}));

import { cached, invalidate, __clearMemoryCache } from './index';
import { getRedis } from '@/lib/redis/client';

describe('cached', () => {
    beforeEach(() => {
        __clearMemoryCache();
        vi.mocked(getRedis).mockReturnValue(null);
    });

    it('calls fetcher and returns result on cache miss', async () => {
        const fetcher = vi.fn().mockResolvedValue({ count: 42 });
        const result = await cached('test-key', fetcher, 60);

        expect(result).toEqual({ count: 42 });
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('returns cached value from L1 memory on second call', async () => {
        const fetcher = vi.fn().mockResolvedValue({ count: 42 });

        await cached('test-key', fetcher, 60);
        const result = await cached('test-key', fetcher, 60);

        expect(result).toEqual({ count: 42 });
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('calls fetcher again after TTL expires', async () => {
        const fetcher = vi.fn()
            .mockResolvedValueOnce({ count: 1 })
            .mockResolvedValueOnce({ count: 2 });

        await cached('test-key', fetcher, 0); // TTL=0 means instant expiry
        // Wait a tick so the entry expires
        await new Promise((r) => setTimeout(r, 10));
        const result = await cached('test-key', fetcher, 0);

        expect(result).toEqual({ count: 2 });
        expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('uses different cache entries for different keys', async () => {
        const fetcherA = vi.fn().mockResolvedValue('A');
        const fetcherB = vi.fn().mockResolvedValue('B');

        const a = await cached('key-a', fetcherA, 60);
        const b = await cached('key-b', fetcherB, 60);

        expect(a).toBe('A');
        expect(b).toBe('B');
        expect(fetcherA).toHaveBeenCalledTimes(1);
        expect(fetcherB).toHaveBeenCalledTimes(1);
    });

    it('reads from Redis L2 when available and L1 is empty', async () => {
        const mockRedis = {
            get: vi.fn().mockResolvedValue(JSON.stringify({ count: 99 })),
            setex: vi.fn().mockResolvedValue('OK'),
        };
        vi.mocked(getRedis).mockReturnValue(mockRedis as any);

        const fetcher = vi.fn().mockResolvedValue({ count: 1 });
        const result = await cached('redis-key', fetcher, 60);

        expect(result).toEqual({ count: 99 });
        expect(fetcher).not.toHaveBeenCalled();
        expect(mockRedis.get).toHaveBeenCalledWith('cache:redis-key');
    });

    it('falls back to fetcher when Redis get fails', async () => {
        const mockRedis = {
            get: vi.fn().mockRejectedValue(new Error('connection lost')),
            setex: vi.fn().mockRejectedValue(new Error('connection lost')),
        };
        vi.mocked(getRedis).mockReturnValue(mockRedis as any);

        const fetcher = vi.fn().mockResolvedValue({ count: 7 });
        const result = await cached('fail-redis', fetcher, 60);

        expect(result).toEqual({ count: 7 });
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('writes to Redis L2 after fetcher call', async () => {
        const mockRedis = {
            get: vi.fn().mockResolvedValue(null),
            setex: vi.fn().mockResolvedValue('OK'),
        };
        vi.mocked(getRedis).mockReturnValue(mockRedis as any);

        const fetcher = vi.fn().mockResolvedValue({ count: 5 });
        await cached('write-key', fetcher, 30);

        expect(mockRedis.setex).toHaveBeenCalledWith(
            'cache:write-key',
            30,
            JSON.stringify({ count: 5 }),
        );
    });
});

describe('invalidate', () => {
    beforeEach(() => {
        __clearMemoryCache();
        vi.mocked(getRedis).mockReturnValue(null);
    });

    it('clears L1 entries matching the prefix', async () => {
        const fetcherA = vi.fn().mockResolvedValue('A');
        const fetcherB = vi.fn().mockResolvedValue('B');

        await cached('dashboard:stats', fetcherA, 60);
        await cached('dashboard:other', fetcherB, 60);

        await invalidate('dashboard:');

        // Both should be evicted — fetcher called again
        const fetcherA2 = vi.fn().mockResolvedValue('A2');
        const fetcherB2 = vi.fn().mockResolvedValue('B2');

        const a = await cached('dashboard:stats', fetcherA2, 60);
        const b = await cached('dashboard:other', fetcherB2, 60);

        expect(a).toBe('A2');
        expect(b).toBe('B2');
    });

    it('does not clear entries with a different prefix', async () => {
        const fetcher = vi.fn().mockResolvedValue('keep');
        await cached('other:key', fetcher, 60);

        await invalidate('dashboard:');

        const fetcher2 = vi.fn().mockResolvedValue('new');
        const result = await cached('other:key', fetcher2, 60);
        expect(result).toBe('keep');
        expect(fetcher2).not.toHaveBeenCalled();
    });

    it('calls Redis keys + del when Redis is available', async () => {
        const mockRedis = {
            keys: vi.fn().mockResolvedValue(['cache:dashboard:stats', 'cache:dashboard:other']),
            del: vi.fn().mockResolvedValue(2),
        };
        vi.mocked(getRedis).mockReturnValue(mockRedis as any);

        await invalidate('dashboard:');

        expect(mockRedis.keys).toHaveBeenCalledWith('cache:dashboard:*');
        expect(mockRedis.del).toHaveBeenCalledWith('cache:dashboard:stats', 'cache:dashboard:other');
    });
});

describe('__clearMemoryCache', () => {
    it('clears all L1 entries', async () => {
        const fetcher = vi.fn().mockResolvedValue('original');
        await cached('key', fetcher, 60);

        __clearMemoryCache();

        const fetcher2 = vi.fn().mockResolvedValue('new');
        const result = await cached('key', fetcher2, 60);
        expect(result).toBe('new');
    });
});
