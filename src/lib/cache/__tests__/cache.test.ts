import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cached, invalidate, clearCache } from '../index';

describe('cache service', () => {
    beforeEach(() => {
        clearCache();
    });

    describe('cached', () => {
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

            // Use a very short TTL (0 seconds = already expired)
            await cached('test:key', fetcher, 0);
            const result = await cached('test:key', fetcher, 0);

            expect(result).toEqual({ id: '1', version: 2 });
            expect(fetcher).toHaveBeenCalledTimes(2);
        });
    });

    describe('invalidate', () => {
        it('clears entries matching prefix', async () => {
            const fetcher1 = vi.fn().mockResolvedValue('a');
            const fetcher2 = vi.fn().mockResolvedValue('b');
            const fetcher3 = vi.fn().mockResolvedValue('c');

            await cached('paciente:id:1', fetcher1, 30);
            await cached('paciente:id:2', fetcher2, 30);
            await cached('cuidador:id:1', fetcher3, 30);

            invalidate('paciente:');

            // Paciente entries should be refetched
            const newFetcher = vi.fn().mockResolvedValue('new');
            await cached('paciente:id:1', newFetcher, 30);
            expect(newFetcher).toHaveBeenCalledTimes(1);

            // Cuidador entry should still be cached
            const cuidadorFetcher = vi.fn().mockResolvedValue('should not call');
            await cached('cuidador:id:1', cuidadorFetcher, 30);
            expect(cuidadorFetcher).not.toHaveBeenCalled();
        });
    });

    describe('clearCache', () => {
        it('clears all cache entries', async () => {
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
