import logger from '@/lib/observability/logger';
import { prisma } from '@/lib/prisma';
import { closeRedis } from '@/lib/redis/client';

const shutdownHandlers: (() => Promise<void>)[] = [];
let shuttingDown = false;

export function onShutdown(handler: () => Promise<void>): void {
    shutdownHandlers.push(handler);
}

export async function gracefulShutdown(signal: string): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;

    await logger.info('shutdown', `Graceful shutdown initiated`, { signal }).catch(() => {});

    for (const handler of shutdownHandlers) {
        try {
            await handler();
        } catch (err) {
            await logger.error('shutdown', 'Shutdown handler error', err instanceof Error ? err : undefined).catch(() => {});
        }
    }

    try {
        await (prisma as any).$disconnect();
    } catch {
        // ignore
    }

    try {
        await closeRedis();
    } catch {
        // ignore
    }

    await logger.info('shutdown', 'Shutdown complete').catch(() => {});
    process.exit(0);
}

if (typeof process !== 'undefined' && process.on) {
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

/** Reset for testing */
export function _resetForTest(): void {
    shuttingDown = false;
    shutdownHandlers.length = 0;
}
