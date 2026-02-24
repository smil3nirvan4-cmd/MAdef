import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
    prisma: {
        whatsAppFlowState: { findUnique: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
        whatsAppLock: { deleteMany: vi.fn(), create: vi.fn(), delete: vi.fn() },
        whatsAppCooldown: { findUnique: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
    }
}));

import { PrismaState } from '../prisma';
import { prisma } from '@/lib/prisma';

const flowState = vi.mocked(prisma.whatsAppFlowState, true);
const lock = vi.mocked(prisma.whatsAppLock as any, true);
const cooldown = vi.mocked(prisma.whatsAppCooldown as any, true);

beforeEach(() => {
    vi.clearAllMocks();
});

describe('PrismaState.getUserState', () => {
    it('returns null when no record', async () => {
        flowState.findUnique.mockResolvedValue(null as any);
        expect(await PrismaState.getUserState('5511999990001')).toBeNull();
    });

    it('returns parsed state when record exists', async () => {
        flowState.findUnique.mockResolvedValue({
            phone: '5511999990001',
            currentFlow: 'QUIZ',
            currentStep: 'Q1',
            data: '{"score":5}',
            lastInteraction: new Date('2025-01-01'),
        } as any);
        const state = await PrismaState.getUserState('5511999990001');
        expect(state).toEqual({
            phone: '5511999990001',
            currentFlow: 'QUIZ',
            currentStep: 'Q1',
            data: { score: 5 },
            lastInteraction: expect.any(Date),
        });
    });
});

describe('PrismaState.setUserState', () => {
    it('creates new state when none exists', async () => {
        flowState.findUnique.mockResolvedValue(null as any);
        flowState.upsert.mockResolvedValue({} as any);
        const result = await PrismaState.setUserState('5511999990001', { currentFlow: 'QUIZ' });
        expect(result.currentFlow).toBe('QUIZ');
        expect(flowState.upsert).toHaveBeenCalled();
    });

    it('merges with existing state', async () => {
        flowState.findUnique.mockResolvedValue({
            phone: '5511999990001',
            currentFlow: 'QUIZ',
            currentStep: 'Q1',
            data: '{"score":5}',
            lastInteraction: new Date(),
        } as any);
        flowState.upsert.mockResolvedValue({} as any);
        const result = await PrismaState.setUserState('5511999990001', { currentStep: 'Q2' });
        expect(result.currentFlow).toBe('QUIZ');
        expect(result.currentStep).toBe('Q2');
    });
});

describe('PrismaState.clearUserState', () => {
    it('deletes state record', async () => {
        flowState.delete.mockResolvedValue({} as any);
        await PrismaState.clearUserState('5511999990001');
        expect(flowState.delete).toHaveBeenCalled();
    });

    it('ignores error if record not found', async () => {
        flowState.delete.mockRejectedValue(new Error('Not found'));
        await expect(PrismaState.clearUserState('xxx')).resolves.toBeUndefined();
    });
});

describe('PrismaState.acquireLock', () => {
    it('returns true when lock is acquired', async () => {
        lock.deleteMany.mockResolvedValue({ count: 0 });
        lock.create.mockResolvedValue({});
        const result = await PrismaState.acquireLock('res1', 'owner1', 30);
        expect(result).toBe(true);
    });

    it('returns false when lock already exists', async () => {
        lock.deleteMany.mockResolvedValue({ count: 0 });
        lock.create.mockRejectedValue(new Error('Unique constraint'));
        const result = await PrismaState.acquireLock('res1', 'owner1', 30);
        expect(result).toBe(false);
    });
});

describe('PrismaState.releaseLock', () => {
    it('deletes the lock', async () => {
        lock.delete.mockResolvedValue({});
        await PrismaState.releaseLock('res1');
        expect(lock.delete).toHaveBeenCalled();
    });

    it('ignores error if lock not found', async () => {
        lock.delete.mockRejectedValue(new Error('Not found'));
        await expect(PrismaState.releaseLock('xxx')).resolves.toBeUndefined();
    });
});

describe('PrismaState.setCooldown', () => {
    it('upserts cooldown record', async () => {
        cooldown.upsert.mockResolvedValue({});
        await PrismaState.setCooldown('user:5511999990001', 30);
        expect(cooldown.upsert).toHaveBeenCalled();
    });
});

describe('PrismaState.checkCooldown', () => {
    it('returns false when no record', async () => {
        cooldown.findUnique.mockResolvedValue(null);
        expect(await PrismaState.checkCooldown('user:123')).toBe(false);
    });

    it('returns true when not expired', async () => {
        cooldown.findUnique.mockResolvedValue({ expiresAt: new Date(Date.now() + 60000) });
        expect(await PrismaState.checkCooldown('user:123')).toBe(true);
    });

    it('returns false and deletes when expired', async () => {
        cooldown.findUnique.mockResolvedValue({ expiresAt: new Date(Date.now() - 1000) });
        cooldown.delete.mockResolvedValue({});
        expect(await PrismaState.checkCooldown('user:123')).toBe(false);
        expect(cooldown.delete).toHaveBeenCalled();
    });
});

describe('PrismaState.getCooldownTTL', () => {
    it('returns 0 when no record', async () => {
        cooldown.findUnique.mockResolvedValue(null);
        expect(await PrismaState.getCooldownTTL('user:123')).toBe(0);
    });

    it('returns remaining seconds when active', async () => {
        cooldown.findUnique.mockResolvedValue({ expiresAt: new Date(Date.now() + 120000) });
        const ttl = await PrismaState.getCooldownTTL('user:123');
        expect(ttl).toBeGreaterThan(100);
        expect(ttl).toBeLessThanOrEqual(120);
    });

    it('returns 0 when expired', async () => {
        cooldown.findUnique.mockResolvedValue({ expiresAt: new Date(Date.now() - 1000) });
        expect(await PrismaState.getCooldownTTL('user:123')).toBe(0);
    });
});
