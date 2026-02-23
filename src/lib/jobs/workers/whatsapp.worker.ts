import { Worker } from 'bullmq';
import { getRedis } from '@/lib/redis/client';

export interface WhatsAppJobData {
    phone: string;
    message: string;
    type: 'text' | 'document' | 'image';
    metadata?: Record<string, unknown>;
}

let worker: Worker | null = null;

export function startWhatsAppWorker(): Worker {
    if (worker) return worker;

    const connection = getRedis();

    worker = new Worker<WhatsAppJobData>(
        'whatsapp',
        async (job) => {
            const { phone, message, type } = job.data;

            const bridgeUrl = process.env.WA_BRIDGE_URL || 'http://127.0.0.1:3001';
            const response = await fetch(`${bridgeUrl}/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: phone, message, type }),
            });

            if (!response.ok) {
                const error = await response.text().catch(() => 'Unknown error');
                throw new Error(`Bridge returned ${response.status}: ${error}`);
            }

            return { sent: true, phone, timestamp: new Date().toISOString() };
        },
        {
            connection,
            concurrency: 5,
            limiter: { max: 20, duration: 60000 }, // 20 msgs/min
        },
    );

    worker.on('completed', (job) => {
        console.info(`[WhatsApp Worker] Job ${job.id} completed: ${job.data.phone}`);
    });

    worker.on('failed', (job, err) => {
        console.error(`[WhatsApp Worker] Job ${job?.id} failed:`, err.message);
    });

    return worker;
}
