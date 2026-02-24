import { Worker } from 'bullmq';
import { getRedis } from '@/lib/redis/client';

let worker: Worker | null = null;

/**
 * Start the BullMQ worker for WhatsApp outbox processing.
 * The worker calls processWhatsAppOutboxOnce() from the existing outbox system.
 * Only starts if Redis is available.
 */
export function startWhatsAppWorker(): Worker | null {
    if (worker) return worker;

    const redis = getRedis();
    if (!redis) return null;

    try {
        worker = new Worker(
            'whatsapp-outbox',
            async (_job) => {
                // Dynamically import to avoid circular dependencies
                const { processWhatsAppOutboxOnce } = await import('@/lib/whatsapp/outbox/worker');
                await processWhatsAppOutboxOnce({ limit: 10 });
            },
            {
                connection: redis,
                concurrency: 1, // Process one batch at a time
                limiter: {
                    max: 5,
                    duration: 10000, // Max 5 jobs per 10s to avoid overwhelming the bridge
                },
            }
        );

        worker.on('failed', (job, err) => {
            console.error(`[WhatsApp Worker] Job ${job?.id} failed:`, err.message);
        });

        return worker;
    } catch {
        return null;
    }
}

/**
 * Stop the worker (for graceful shutdown).
 */
export async function stopWhatsAppWorker(): Promise<void> {
    if (worker) {
        await worker.close();
        worker = null;
    }
}
