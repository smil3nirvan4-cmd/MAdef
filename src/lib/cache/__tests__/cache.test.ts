import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Redis as unavailable by default (preserves L1-only behavior)
vi.mock('@/lib/redis/client', () => ({
    getRedis: vi.fn().mockResolvedValue(null),
}));

import { cached, invalidate, clearCache } from '../index';
import { getRedis } from '@/lib/redis/client';

describe('cache service', () => {
    beforeEach(() => {
        clearCache();
        vi.clearAllMocks();
    });

    describe('cached (L1 only — no Redis)', () => {
        it('returns fetched value on cache miss', async () => {
            const fetcher = vi.fn().mockResolvedValue({ id: '1', nome: 'Ana' });
            const result = await cached('test:key', fetcher, 30);
            expect(result).toEqual({ id: '1', nome: 'Ana' });
            expect(fetcher).toHaveBeenCalledTimes(1);
        });

        it('returns cached value on cache hit', async () => {
            const fetcher = vi.fn().mockResolvedValue({ id: '1', nome: 'Ana' });

            await cached('test:key', fetcher, 30);
            const result = await cached('test:key', fetcher, 30);

            expect(result).toEqual({ id: '1', nome: 'Ana' });
            expect(fetcher).toHaveBeenCalledTimes(1);
        });

        it('re-fetches after TTL expires', async () => {
            const fetcher = vi.fn()
                .mockResolvedValueOnce({ id: '1', version: 1 })
                .mockResolvedValueOnce({ id: '1', version: 2 });

            await cached('test:key', fetcher, 0);
            const result = await cached('test:key', fetcher, 0);

            expect(result).toEqual({ id: '1', version: 2 });
            expect(fetcher).toHaveBeenCalledTimes(2);
        });
    });

    describe('cached (L2 — Redis available)', () => {
        it('reads from Redis L2 on L1 miss', async () => {
            const mockRedis = {
                get: vi.fn().mockResolvedValue(JSON.stringify({ id: 'from-redis' })),
                set: vi.fn().mockResolvedValue('OK'),
            };
            (getRedis as ReturnType<typeof vi.fn>).mockResolvedValue(mockRedis);

            const fetcher = vi.fn().mockResolvedValue({ id: 'from-db' });
            const result = await cached('l2:key', fetcher, 30);

            expect(result).toEqual({ id: 'from-redis' });
            expect(fetcher).not.toHaveBeenCalled();
        });

        it('writes to Redis L2 on fetch', async () => {
            const mockRedis = {
                get: vi.fn().mockResolvedValue(null),
                set: vi.fn().mockResolvedValue('OK'),
            };
            (getRedis as ReturnType<typeof vi.fn>).mockResolvedValue(mockRedis);

            const fetcher = vi.fn().mockResolvedValue({ id: 'new' });
            await cached('l2:miss', fetcher, 60);

            expect(mockRedis.set).toHaveBeenCalledWith(
                'cache:l2:miss',
                JSON.stringify({ id: 'new' }),
                'EX',
                60,
            );
        });

        it('falls back to fetcher if Redis throws', async () => {
            const mockRedis = {
                get: vi.fn().mockRejectedValue(new Error('connection lost')),
                set: vi.fn().mockRejectedValue(new Error('connection lost')),
            };
            (getRedis as ReturnType<typeof vi.fn>).mockResolvedValue(mockRedis);

            const fetcher = vi.fn().mockResolvedValue({ id: 'fallback' });
            const result = await cached('l2:err', fetcher, 30);

            expect(result).toEqual({ id: 'fallback' });
            expect(fetcher).toHaveBeenCalledTimes(1);
        });
    });

    describe('invalidate', () => {
        it('clears entries matching prefix', async () => {
            (getRedis as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            const fetcher1 = vi.fn().mockResolvedValue('a');
            const fetcher2 = vi.fn().mockResolvedValue('b');
            const fetcher3 = vi.fn().mockResolvedValue('c');

            await cached('paciente:id:1', fetcher1, 30);
            await cached('paciente:id:2', fetcher2, 30);
            await cached('cuidador:id:1', fetcher3, 30);

            invalidate('paciente:');

            const newFetcher = vi.fn().mockResolvedValue('new');
            await cached('paciente:id:1', newFetcher, 30);
            expect(newFetcher).toHaveBeenCalledTimes(1);

            const cuidadorFetcher = vi.fn().mockResolvedValue('should not call');
            await cached('cuidador:id:1', cuidadorFetcher, 30);
            expect(cuidadorFetcher).not.toHaveBeenCalled();
        });
    });

    describe('clearCache', () => {
        it('clears all cache entries', async () => {
            (getRedis as ReturnType<typeof vi.fn>).mockResolvedValue(null);

            const fetcher = vi.fn().mockResolvedValue('x');
            await cached('test:1', fetcher, 30);
            await cached('test:2', fetcher, 30);

            clearCache();

            const newFetcher = vi.fn().mockResolvedValue('y');
            await cached('test:1', newFetcher, 30);
            expect(newFetcher).toHaveBeenCalledTimes(1);
        });
    });
});
