import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/observability/logger', () => ({
    default: {
        info: vi.fn().mockResolvedValue(undefined),
        error: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('@/lib/prisma', () => ({
    prisma: { $disconnect: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@/lib/redis/client', () => ({
    closeRedis: vi.fn().mockResolvedValue(undefined),
}));

// Must mock process.exit before importing module
const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

import { onShutdown, gracefulShutdown, _resetForTest } from '../shutdown';
import logger from '@/lib/observability/logger';
import { prisma } from '@/lib/prisma';
import { closeRedis } from '@/lib/redis/client';

describe('graceful shutdown', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        _resetForTest();
    });

    it('onShutdown registers handler', async () => {
        const handler = vi.fn().mockResolvedValue(undefined);
        onShutdown(handler);

        await gracefulShutdown('SIGTERM');

        expect(handler).toHaveBeenCalledOnce();
    });

    it('gracefulShutdown executes all handlers', async () => {
        const h1 = vi.fn().mockResolvedValue(undefined);
        const h2 = vi.fn().mockResolvedValue(undefined);
        onShutdown(h1);
        onShutdown(h2);

        await gracefulShutdown('SIGINT');

        expect(h1).toHaveBeenCalledOnce();
        expect(h2).toHaveBeenCalledOnce();
    });

    it('calls prisma.$disconnect()', async () => {
        await gracefulShutdown('SIGTERM');
        expect(prisma.$disconnect).toHaveBeenCalledOnce();
    });

    it('calls closeRedis()', async () => {
        await gracefulShutdown('SIGTERM');
        expect(closeRedis).toHaveBeenCalledOnce();
    });

    it('if a handler fails, others still execute', async () => {
        const failing = vi.fn().mockRejectedValue(new Error('boom'));
        const passing = vi.fn().mockResolvedValue(undefined);
        onShutdown(failing);
        onShutdown(passing);

        await gracefulShutdown('SIGTERM');

        expect(failing).toHaveBeenCalledOnce();
        expect(passing).toHaveBeenCalledOnce();
        expect(logger.error).toHaveBeenCalled();
    });

    it('calls process.exit(0)', async () => {
        await gracefulShutdown('SIGTERM');
        expect(mockExit).toHaveBeenCalledWith(0);
    });

    it('only shuts down once (idempotent)', async () => {
        await gracefulShutdown('SIGTERM');
        await gracefulShutdown('SIGINT');
        expect(prisma.$disconnect).toHaveBeenCalledTimes(1);
    });
});
