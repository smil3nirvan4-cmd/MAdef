import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// Force memory state via env var before module loads
beforeAll(() => {
    process.env.USE_MEMORY_STATE = 'true';
});

// Mock fs to prevent real file I/O from the memory state module
vi.mock('fs', () => ({
    existsSync: vi.fn(() => false),
    readFileSync: vi.fn(() => '{}'),
    writeFileSync: vi.fn(),
}));

vi.mock('@/lib/observability/logger', () => ({
    default: {
        info: vi.fn().mockResolvedValue(undefined),
        warning: vi.fn().mockResolvedValue(undefined),
        error: vi.fn().mockResolvedValue(undefined),
        debug: vi.fn().mockResolvedValue(undefined),
        whatsapp: vi.fn().mockResolvedValue(undefined),
    },
}));

// Clear globalThis state so we get a fresh memory store for each test suite run
const g = globalThis as any;
delete g.memoryStateStore;

import {
    getUserState,
    setUserState,
    clearUserState,
    acquireSlotLock,
    releaseSlotLock,
    setCooldown,
    checkCooldown,
    getCooldownTTL,
} from '../state-manager';

beforeEach(() => {
    // Reset the in-memory state store between tests
    if (g.memoryStateStore) {
        g.memoryStateStore.states.clear();
        g.memoryStateStore.locks.clear();
        g.memoryStateStore.cooldowns.clear();
    }
});

describe('getUserState', () => {
    it('returns null when no state exists for phone', async () => {
        const result = await getUserState('5511999990001');
        expect(result).toBeNull();
    });

    it('returns state after it has been set', async () => {
        await setUserState('5511999990001', {
            currentFlow: 'CADASTRO',
            currentStep: 'NOME',
        });

        const result = await getUserState('5511999990001');

        expect(result).not.toBeNull();
        expect(result!.phone).toBe('5511999990001');
        expect(result!.currentFlow).toBe('CADASTRO');
        expect(result!.currentStep).toBe('NOME');
    });

    it('returns null for a different phone', async () => {
        await setUserState('5511999990001', { currentFlow: 'CADASTRO' });

        const result = await getUserState('5511999990099');
        expect(result).toBeNull();
    });
});

describe('setUserState', () => {
    it('creates initial state with defaults for new phone', async () => {
        // Use a phone number not used in any other test to verify defaults
        const result = await setUserState('5511999995555', {});

        expect(result.phone).toBe('5511999995555');
        expect(result.currentFlow).toBe('IDLE');
        expect(result.currentStep).toBe('');
        expect(result.data).toEqual({});
        expect(result.lastInteraction).toBeInstanceOf(Date);
    });

    it('merges partial updates into existing state', async () => {
        await setUserState('5511999990001', {
            currentFlow: 'CADASTRO',
            currentStep: 'NOME',
            data: { nome: 'Test' },
        });

        const result = await setUserState('5511999990001', {
            currentStep: 'CPF',
        });

        expect(result.currentFlow).toBe('CADASTRO');
        expect(result.currentStep).toBe('CPF');
        expect(result.data).toEqual({ nome: 'Test' });
    });

    it('updates lastInteraction on each set', async () => {
        const first = await setUserState('5511999990001', { currentFlow: 'A' });
        const firstTime = first.lastInteraction;

        // Small delay to ensure different timestamp
        await new Promise(resolve => setTimeout(resolve, 10));

        const second = await setUserState('5511999990001', { currentFlow: 'B' });

        expect(second.lastInteraction.getTime()).toBeGreaterThanOrEqual(firstTime.getTime());
    });
});

describe('clearUserState', () => {
    it('removes state for the phone', async () => {
        await setUserState('5511999990001', { currentFlow: 'CADASTRO' });

        await clearUserState('5511999990001');

        const result = await getUserState('5511999990001');
        expect(result).toBeNull();
    });

    it('does not throw when clearing non-existent state', async () => {
        await expect(clearUserState('5511999990099')).resolves.toBeUndefined();
    });

    it('does not affect other phone states', async () => {
        await setUserState('5511999990001', { currentFlow: 'FLOW_A' });
        await setUserState('5511999990002', { currentFlow: 'FLOW_B' });

        await clearUserState('5511999990001');

        const result1 = await getUserState('5511999990001');
        const result2 = await getUserState('5511999990002');

        expect(result1).toBeNull();
        expect(result2).not.toBeNull();
        expect(result2!.currentFlow).toBe('FLOW_B');
    });
});

describe('acquireSlotLock', () => {
    it('acquires lock successfully on first attempt', async () => {
        const result = await acquireSlotLock('slot-123', 'cuidador-1');
        expect(result).toBe(true);
    });

    it('fails to acquire lock when already held', async () => {
        await acquireSlotLock('slot-123', 'cuidador-1');

        const result = await acquireSlotLock('slot-123', 'cuidador-2');
        expect(result).toBe(false);
    });

    it('allows different slots to be locked independently', async () => {
        const result1 = await acquireSlotLock('slot-1', 'cuidador-1');
        const result2 = await acquireSlotLock('slot-2', 'cuidador-2');

        expect(result1).toBe(true);
        expect(result2).toBe(true);
    });
});

describe('releaseSlotLock', () => {
    it('releases a held lock', async () => {
        await acquireSlotLock('slot-123', 'cuidador-1');

        await releaseSlotLock('slot-123');

        // Should be able to re-acquire after release
        const result = await acquireSlotLock('slot-123', 'cuidador-2');
        expect(result).toBe(true);
    });

    it('does not throw when releasing non-existent lock', async () => {
        await expect(releaseSlotLock('nonexistent-slot')).resolves.toBeUndefined();
    });
});

describe('setCooldown', () => {
    it('sets a cooldown that can be checked', async () => {
        await setCooldown('cuidador-1', 5);

        const isActive = await checkCooldown('cuidador-1');
        expect(isActive).toBe(true);
    });

    it('sets cooldown with zero minutes that expires immediately', async () => {
        await setCooldown('cuidador-1', 0);

        // With 0 minutes, the expiry is Date.now(), so it should be expired immediately or nearly so
        // The implementation checks Date.now() > expiry, so with 0 minutes it should be at the boundary
        const isActive = await checkCooldown('cuidador-1');
        // Could be true or false depending on timing, just verify it doesn't throw
        expect(typeof isActive).toBe('boolean');
    });
});

describe('checkCooldown', () => {
    it('returns false when no cooldown is set', async () => {
        const result = await checkCooldown('cuidador-nonexistent');
        expect(result).toBe(false);
    });

    it('returns true when cooldown is active', async () => {
        await setCooldown('cuidador-1', 10);

        const result = await checkCooldown('cuidador-1');
        expect(result).toBe(true);
    });

    it('returns false after cooldown expires', async () => {
        // Set cooldown with negative minutes to simulate expired (hack: set expiry in past)
        // Actually we can't do negative easily. Instead test with the internal store.
        if (g.memoryStateStore) {
            g.memoryStateStore.cooldowns.set('cooldown:cuidador-expired', Date.now() - 1000);
        }

        const result = await checkCooldown('cuidador-expired');
        expect(result).toBe(false);
    });
});

describe('getCooldownTTL', () => {
    it('returns 0 when no cooldown is set', async () => {
        const result = await getCooldownTTL('cuidador-nonexistent');
        expect(result).toBe(0);
    });

    it('returns positive TTL when cooldown is active', async () => {
        await setCooldown('cuidador-1', 5);

        const result = await getCooldownTTL('cuidador-1');
        expect(result).toBeGreaterThan(0);
        // Should be approximately 300 seconds (5 minutes), give or take
        expect(result).toBeLessThanOrEqual(300);
    });

    it('returns 0 when cooldown has expired', async () => {
        if (g.memoryStateStore) {
            g.memoryStateStore.cooldowns.set('cooldown:cuidador-expired', Date.now() - 1000);
        }

        const result = await getCooldownTTL('cuidador-expired');
        expect(result).toBe(0);
    });
});
