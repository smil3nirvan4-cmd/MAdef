import { Queue } from 'bullmq';
import { getRedis } from '@/lib/redis/client';
import logger from '@/lib/observability/logger';

let queue: Queue | null = null;
let initialized = false;

export async function getWhatsAppQueue(): Promise<Queue | null> {
    if (initialized) return queue;
    initialized = true;

    const redis = await getRedis();
    if (!redis) {
        logger.warning('bullmq.init', 'Redis unavailable, WhatsApp queue disabled (sync fallback)', { module: 'whatsapp-queue' });
        return null;
    }

    try {
        queue = new Queue('whatsapp-outbox', {
            connection: redis,
            defaultJobOptions: {
                attempts: 1,
                removeOnComplete: { count: 500 },
                removeOnFail: { count: 200 },
            },
        });
        logger.info('bullmq.init', 'WhatsApp outbox queue initialized', { module: 'whatsapp-queue' });
        return queue;
    } catch (err) {
        logger.warning('bullmq.init', 'Failed to create queue', { module: 'whatsapp-queue', error: String(err) });
        return null;
    }
}

export async function enqueueOutboxProcess(options?: { limit?: number }): Promise<boolean> {
    const q = await getWhatsAppQueue();
    if (!q) return false;

    try {
        await q.add('process-outbox', { limit: options?.limit ?? 20 }, {
            jobId: `outbox-${Date.now()}`,
        });
        return true;
    } catch {
        return false;
    }
}

/** For testing: reset singleton */
export function _resetForTest(): void {
    queue = null;
    initialized = false;
}
