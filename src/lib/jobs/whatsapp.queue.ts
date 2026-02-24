import { Queue } from 'bullmq';
import { getRedis } from '@/lib/redis/client';

/**
 * BullMQ queue for WhatsApp outbox processing.
 * Falls back to null if Redis is unavailable — callers must handle the null case
 * by using the existing DB-based polling (processWhatsAppOutboxOnce).
 */
function createQueue(): Queue | null {
    const redis = getRedis();
    if (!redis) return null;

    try {
        return new Queue('whatsapp-outbox', {
            connection: redis,
            defaultJobOptions: {
                attempts: 3,
                backoff: { type: 'exponential', delay: 2000 },
                removeOnComplete: { count: 1000 },
                removeOnFail: { count: 5000 },
            },
        });
    } catch {
        return null;
    }
}

let _queue: Queue | null | undefined;

export function getWhatsAppQueue(): Queue | null {
    if (_queue === undefined) {
        _queue = createQueue();
    }
    return _queue;
}

/**
 * Enqueue a "process outbox" job. The worker will call processWhatsAppOutboxOnce().
 * This replaces the polling approach when Redis is available.
 */
export async function triggerOutboxProcessing(opts?: { delay?: number }): Promise<boolean> {
    const queue = getWhatsAppQueue();
    if (!queue) return false;

    try {
        await queue.add('process-outbox', { triggeredAt: Date.now() }, {
            delay: opts?.delay,
            // Deduplicate: only one process job at a time
            jobId: `process-outbox-${Math.floor(Date.now() / 5000)}`,
        });
        return true;
    } catch {
        return false;
    }
}
