import { Worker } from 'bullmq';
import { getRedis } from '@/lib/redis/client';
import logger from '@/lib/observability/logger';

let worker: Worker | null = null;

export async function startWhatsAppWorker(): Promise<void> {
    const redis = await getRedis();
    if (!redis) {
        logger.warning('bullmq.worker', 'Redis unavailable, worker not started', { module: 'whatsapp-worker' });
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
            logger.info('bullmq.worker', `Job ${job?.id} completed`, { module: 'whatsapp-worker', jobId: job?.id });
        });

        worker.on('failed', (job, err) => {
            logger.error('bullmq.worker', `Job ${job?.id} failed`, { module: 'whatsapp-worker', jobId: job?.id, errorMessage: err.message });
        });

        logger.info('bullmq.worker', 'WhatsApp outbox worker started', { module: 'whatsapp-worker' });
    } catch (err) {
        logger.warning('bullmq.worker', 'Failed to start worker', { module: 'whatsapp-worker', error: String(err) });
    }
}

export async function stopWhatsAppWorker(): Promise<void> {
    if (worker) {
        await worker.close();
        worker = null;
    }
}
