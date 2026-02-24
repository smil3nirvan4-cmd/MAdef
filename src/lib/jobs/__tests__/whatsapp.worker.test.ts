import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────
const mockOn = vi.fn();
const mockClose = vi.fn().mockResolvedValue(undefined);

vi.mock('bullmq', () => {
    const WorkerMock = vi.fn().mockImplementation(function (this: any, _name: string, _processor: any, _opts: any) {
        this.on = mockOn;
        this.close = mockClose;
    });
    return { Worker: WorkerMock };
});

vi.mock('@/lib/redis/client', () => ({
    getRedis: vi.fn().mockResolvedValue(null),
}));

const mockProcessOutbox = vi.fn().mockResolvedValue({ processed: 5 });

vi.mock('@/lib/whatsapp/outbox/worker', () => ({
    processWhatsAppOutboxOnce: mockProcessOutbox,
}));

// ── Imports ────────────────────────────────────────────────────
import { startWhatsAppWorker, stopWhatsAppWorker } from '../whatsapp.worker';
import { getRedis } from '@/lib/redis/client';
import { Worker } from 'bullmq';

const mockRedis = { status: 'ready' };

// ── Helpers ────────────────────────────────────────────────────
// We need to reset the module-level `worker` variable between tests.
// Since there's no _resetForTest export, we re-import the module each time.
async function freshImport() {
    vi.resetModules();
    // Re-apply mocks after module reset
    vi.doMock('bullmq', () => {
        const WorkerMock = vi.fn().mockImplementation(function (this: any) {
            this.on = mockOn;
            this.close = mockClose;
        });
        return { Worker: WorkerMock };
    });
    vi.doMock('@/lib/redis/client', () => ({
        getRedis: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock('@/lib/whatsapp/outbox/worker', () => ({
        processWhatsAppOutboxOnce: mockProcessOutbox,
    }));

    const mod = await import('../whatsapp.worker');
    return mod;
}

// ── Setup ──────────────────────────────────────────────────────
beforeEach(() => {
    vi.clearAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────
describe('whatsapp.worker', () => {
    describe('startWhatsAppWorker', () => {
        it('does not start worker when Redis is unavailable', async () => {
            const mod = await freshImport();
            const { getRedis: getR } = await import('@/lib/redis/client');
            vi.mocked(getR).mockResolvedValue(null);

            await mod.startWhatsAppWorker();

            const { Worker: W } = await import('bullmq');
            expect(W).not.toHaveBeenCalled();
        });

        it('creates Worker when Redis is available', async () => {
            const mod = await freshImport();
            const { getRedis: getR } = await import('@/lib/redis/client');
            vi.mocked(getR).mockResolvedValue(mockRedis as any);

            await mod.startWhatsAppWorker();

            const { Worker: W } = await import('bullmq');
            expect(W).toHaveBeenCalledWith(
                'whatsapp-outbox',
                expect.any(Function),
                expect.objectContaining({
                    connection: mockRedis,
                    concurrency: 3,
                }),
            );
        });

        it('registers completed and failed event handlers', async () => {
            const mod = await freshImport();
            const { getRedis: getR } = await import('@/lib/redis/client');
            vi.mocked(getR).mockResolvedValue(mockRedis as any);

            await mod.startWhatsAppWorker();

            expect(mockOn).toHaveBeenCalledWith('completed', expect.any(Function));
            expect(mockOn).toHaveBeenCalledWith('failed', expect.any(Function));
        });

        it('does not create a second worker on repeated calls', async () => {
            const mod = await freshImport();
            const { getRedis: getR } = await import('@/lib/redis/client');
            vi.mocked(getR).mockResolvedValue(mockRedis as any);

            await mod.startWhatsAppWorker();
            await mod.startWhatsAppWorker();

            const { Worker: W } = await import('bullmq');
            expect(W).toHaveBeenCalledTimes(1);
        });

        it('handles Worker constructor failure gracefully', async () => {
            vi.resetModules();
            vi.doMock('bullmq', () => {
                const WorkerMock = vi.fn().mockImplementation(() => {
                    throw new Error('Worker init failed');
                });
                return { Worker: WorkerMock };
            });
            vi.doMock('@/lib/redis/client', () => ({
                getRedis: vi.fn().mockResolvedValue(mockRedis),
            }));
            vi.doMock('@/lib/whatsapp/outbox/worker', () => ({
                processWhatsAppOutboxOnce: mockProcessOutbox,
            }));

            const mod = await import('../whatsapp.worker');

            // Should not throw
            await expect(mod.startWhatsAppWorker()).resolves.toBeUndefined();
        });
    });

    describe('stopWhatsAppWorker', () => {
        it('does nothing when no worker is running', async () => {
            const mod = await freshImport();

            await mod.stopWhatsAppWorker();

            expect(mockClose).not.toHaveBeenCalled();
        });

        it('closes the worker and clears reference', async () => {
            const mod = await freshImport();
            const { getRedis: getR } = await import('@/lib/redis/client');
            vi.mocked(getR).mockResolvedValue(mockRedis as any);

            await mod.startWhatsAppWorker();
            await mod.stopWhatsAppWorker();

            expect(mockClose).toHaveBeenCalledOnce();
        });

        it('allows restarting after stop', async () => {
            const mod = await freshImport();
            const { getRedis: getR } = await import('@/lib/redis/client');
            vi.mocked(getR).mockResolvedValue(mockRedis as any);

            await mod.startWhatsAppWorker();
            await mod.stopWhatsAppWorker();
            await mod.startWhatsAppWorker();

            const { Worker: W } = await import('bullmq');
            expect(W).toHaveBeenCalledTimes(2);
        });
    });

    describe('worker job processor', () => {
        it('calls processWhatsAppOutboxOnce with default limit', async () => {
            const mod = await freshImport();
            const { getRedis: getR } = await import('@/lib/redis/client');
            vi.mocked(getR).mockResolvedValue(mockRedis as any);

            await mod.startWhatsAppWorker();

            // Get the processor function from Worker constructor call
            const { Worker: W } = await import('bullmq');
            const processorFn = vi.mocked(W).mock.calls[0][1] as (job: any) => Promise<any>;

            const result = await processorFn({ data: {} });

            const { processWhatsAppOutboxOnce } = await import('@/lib/whatsapp/outbox/worker');
            expect(processWhatsAppOutboxOnce).toHaveBeenCalledWith({ limit: 20 });
            expect(result).toEqual({ processed: 5 });
        });

        it('uses job.data.limit when provided', async () => {
            const mod = await freshImport();
            const { getRedis: getR } = await import('@/lib/redis/client');
            vi.mocked(getR).mockResolvedValue(mockRedis as any);

            await mod.startWhatsAppWorker();

            const { Worker: W } = await import('bullmq');
            const processorFn = vi.mocked(W).mock.calls[0][1] as (job: any) => Promise<any>;

            await processorFn({ data: { limit: 50 } });

            const { processWhatsAppOutboxOnce } = await import('@/lib/whatsapp/outbox/worker');
            expect(processWhatsAppOutboxOnce).toHaveBeenCalledWith({ limit: 50 });
        });
    });
});
