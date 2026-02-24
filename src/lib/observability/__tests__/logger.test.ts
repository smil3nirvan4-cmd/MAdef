import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
    prisma: {
        systemLog: { create: vi.fn().mockResolvedValue({}) },
    },
}));

import { logEvent } from '../logger';
import { prisma } from '@/lib/prisma';

beforeEach(() => {
    vi.clearAllMocks();
});

describe('logEvent', () => {
    it('persists log to database', async () => {
        await logEvent({
            type: 'INFO',
            action: 'test_action',
            message: 'Test message',
        });

        expect(prisma.systemLog.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                type: 'INFO',
                action: 'test_action',
                message: 'Test message',
            }),
        });
    });

    it('includes metadata in log', async () => {
        await logEvent({
            type: 'ERROR',
            action: 'error_action',
            message: 'Error occurred',
            metadata: { extra: 'data' },
            stack: 'Error\n at test.ts:1',
        });

        expect(prisma.systemLog.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                type: 'ERROR',
                stack: expect.stringContaining('Error'),
            }),
        });
    });

    it('handles database errors gracefully', async () => {
        vi.mocked(prisma.systemLog.create).mockRejectedValueOnce(new Error('DB down'));

        // Should not throw
        await logEvent({
            type: 'INFO',
            action: 'test',
            message: 'test',
        });
    });

    it('includes ipAddress and userAgent when provided', async () => {
        await logEvent({
            type: 'WARNING',
            action: 'warn',
            message: 'Warning msg',
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0',
        });

        expect(prisma.systemLog.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                ipAddress: '192.168.1.1',
                userAgent: 'Mozilla/5.0',
            }),
        });
    });
});
