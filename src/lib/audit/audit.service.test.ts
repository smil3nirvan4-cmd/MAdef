import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCreate } = vi.hoisted(() => ({
    mockCreate: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
    prisma: { auditLog: { create: mockCreate } },
}));

vi.mock('@/lib/observability/request-context', () => ({
    RequestContext: { getRequestId: () => 'test-id', getDurationMs: () => 0 },
}));

import { computeChanges, logAudit } from './audit.service';

describe('computeChanges', () => {
    it('detects added fields', () => {
        const before = { name: 'Alice' };
        const after = { name: 'Alice', email: 'alice@test.com' };

        const diff = computeChanges(before, after);

        expect(diff).toEqual({
            email: { from: undefined, to: 'alice@test.com' },
        });
    });

    it('detects modified fields', () => {
        const before = { name: 'Alice', age: 25 };
        const after = { name: 'Bob', age: 25 };

        const diff = computeChanges(before, after);

        expect(diff).toEqual({
            name: { from: 'Alice', to: 'Bob' },
        });
    });

    it('detects removed fields', () => {
        const before = { name: 'Alice', email: 'a@b.com' };
        const after = { name: 'Alice' };

        const diff = computeChanges(before, after);

        expect(diff).toEqual({
            email: { from: 'a@b.com', to: undefined },
        });
    });

    it('ignores updatedAt field', () => {
        const before = { name: 'Alice', updatedAt: '2024-01-01' };
        const after = { name: 'Alice', updatedAt: '2024-06-01' };

        const diff = computeChanges(before, after);

        expect(diff).toEqual({});
    });

    it('ignores createdAt field', () => {
        const before = { name: 'Alice', createdAt: '2024-01-01' };
        const after = { name: 'Alice', createdAt: '2024-06-01' };

        const diff = computeChanges(before, after);

        expect(diff).toEqual({});
    });

    it('ignores both updatedAt and createdAt simultaneously', () => {
        const before = { name: 'Alice', updatedAt: 'a', createdAt: 'b' };
        const after = { name: 'Alice', updatedAt: 'c', createdAt: 'd' };

        const diff = computeChanges(before, after);

        expect(diff).toEqual({});
    });

    it('returns empty object for identical objects', () => {
        const before = { name: 'Alice', age: 30, active: true };
        const after = { name: 'Alice', age: 30, active: true };

        const diff = computeChanges(before, after);

        expect(diff).toEqual({});
    });

    it('detects changes in nested values via JSON comparison', () => {
        const before = { config: { theme: 'dark' } };
        const after = { config: { theme: 'light' } };

        const diff = computeChanges(before, after);

        expect(diff).toEqual({
            config: {
                from: { theme: 'dark' },
                to: { theme: 'light' },
            },
        });
    });
});

describe('logAudit', () => {
    beforeEach(() => {
        mockCreate.mockReset();
    });

    it('calls prisma.auditLog.create with correct data', async () => {
        mockCreate.mockResolvedValue({});

        await logAudit({
            entity: 'Paciente',
            entityId: 'p-1',
            action: 'CREATE',
            changes: { name: { from: null, to: 'Alice' } },
            userId: 'user-1',
        });

        expect(mockCreate).toHaveBeenCalledWith({
            data: {
                entity: 'Paciente',
                entityId: 'p-1',
                action: 'CREATE',
                changes: JSON.stringify({ name: { from: null, to: 'Alice' } }),
                userId: 'user-1',
                requestId: 'test-id',
            },
        });
    });

    it('passes null for changes when not provided', async () => {
        mockCreate.mockResolvedValue({});

        await logAudit({
            entity: 'Cuidador',
            entityId: 'c-1',
            action: 'DELETE',
        });

        expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
                changes: null,
            }),
        });
    });

    it('does not throw when prisma.create fails', async () => {
        mockCreate.mockRejectedValue(new Error('DB down'));

        await expect(
            logAudit({
                entity: 'Paciente',
                entityId: 'p-1',
                action: 'UPDATE',
            }),
        ).resolves.toBeUndefined();
    });
});
