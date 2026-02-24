import { Worker } from 'bullmq';
import { getRedis } from '@/lib/redis/client';

let worker: Worker | null = null;

export async function startWhatsAppWorker(): Promise<void> {
    const redis = await getRedis();
    if (!redis) {
        console.warn('[BullMQ Worker] Redis unavailable, worker not started');
        return;
    }

    if (worker) return;

    try {
        const { processWhatsAppOutboxOnce } = await import(
            '@/lib/whatsapp/outbox/worker'
        );

        worker = new Worker(
            'whatsapp-outbox',
            async (job) => {
                const limit = job.data?.limit ?? 20;
                const result = await processWhatsAppOutboxOnce({ limit });
                return result;
            },
            {
                connection: redis,
                concurrency: 3,
                limiter: {
                    max: 10,
                    duration: 1000,
                },
            },
        );

        worker.on('completed', (job) => {
            console.log(`[BullMQ Worker] Job ${job?.id} completed`);
        });

        worker.on('failed', (job, err) => {
            console.error(`[BullMQ Worker] Job ${job?.id} failed:`, err.message);
        });

        console.log('[BullMQ Worker] WhatsApp outbox worker started');
    } catch (err) {
        console.warn('[BullMQ Worker] Failed to start worker:', err);
    }
}

export async function stopWhatsAppWorker(): Promise<void> {
    if (worker) {
        await worker.close();
        worker = null;
    }
}
