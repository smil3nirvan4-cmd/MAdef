import { Queue } from 'bullmq';
import { getRedis } from '@/lib/redis/client';

let queue: Queue | null = null;
let initialized = false;

export async function getWhatsAppQueue(): Promise<Queue | null> {
    if (initialized) return queue;
    initialized = true;

    const redis = await getRedis();
    if (!redis) {
        console.warn('[BullMQ] Redis unavailable, WhatsApp queue disabled (sync fallback)');
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
        console.log('[BullMQ] WhatsApp outbox queue initialized');
        return queue;
    } catch (err) {
        console.warn('[BullMQ] Failed to create queue:', err);
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
