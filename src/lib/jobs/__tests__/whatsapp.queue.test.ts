import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAdd = vi.fn().mockResolvedValue({ id: 'job-1' });
const mockClose = vi.fn().mockResolvedValue(undefined);

vi.mock('bullmq', () => {
    // Must use function() for constructor mock (not arrow function)
    const QueueMock = vi.fn().mockImplementation(function (this: any) {
        this.add = mockAdd;
        this.close = mockClose;
    });
    return { Queue: QueueMock };
});

vi.mock('@/lib/redis/client', () => ({
    getRedis: vi.fn().mockResolvedValue(null),
}));

import { getWhatsAppQueue, enqueueOutboxProcess, _resetForTest } from '../whatsapp.queue';
import { getRedis } from '@/lib/redis/client';

const mockRedis = { status: 'ready' };

beforeEach(() => {
    _resetForTest();
    mockAdd.mockClear();
    mockClose.mockClear();
    vi.mocked(getRedis).mockReset();
});

describe('whatsapp.queue', () => {
    it('returns null when Redis is unavailable', async () => {
        vi.mocked(getRedis).mockResolvedValue(null);
        const queue = await getWhatsAppQueue();
        expect(queue).toBeNull();
    });

    it('creates queue when Redis is available', async () => {
        vi.mocked(getRedis).mockResolvedValue(mockRedis as any);
        const queue = await getWhatsAppQueue();
        expect(queue).not.toBeNull();
    });

    it('enqueueOutboxProcess returns false without Redis', async () => {
        vi.mocked(getRedis).mockResolvedValue(null);
        const result = await enqueueOutboxProcess();
        expect(result).toBe(false);
    });

    it('enqueueOutboxProcess returns true with Redis', async () => {
        vi.mocked(getRedis).mockResolvedValue(mockRedis as any);
        const result = await enqueueOutboxProcess({ limit: 10 });
        expect(result).toBe(true);
        expect(mockAdd).toHaveBeenCalledWith(
            'process-outbox',
            { limit: 10 },
            expect.any(Object),
        );
    });

    it('returns same queue instance on repeated calls', async () => {
        vi.mocked(getRedis).mockResolvedValue(mockRedis as any);
        const q1 = await getWhatsAppQueue();
        const q2 = await getWhatsAppQueue();
        expect(q1).toBe(q2);
    });
});
