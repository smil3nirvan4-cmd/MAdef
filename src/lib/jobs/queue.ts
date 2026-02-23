import { Queue } from 'bullmq';
import { getRedis } from '@/lib/redis/client';

const connection = getRedis();

export const whatsappQueue = new Queue('whatsapp', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
    },
});

export const notificationQueue = new Queue('notification', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 1000 },
    },
});

export const pdfQueue = new Queue('pdf', {
    connection,
    defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'fixed', delay: 10000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 500 },
    },
});
