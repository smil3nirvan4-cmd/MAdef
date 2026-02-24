import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('fs', () => ({
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn().mockReturnValue('{}'),
    writeFileSync: vi.fn(),
}));

// Reset global store before each test so tests are isolated
beforeEach(() => {
    const g = globalThis as any;
    g.memoryStateStore = {
        states: new Map<string, string>(),
        locks: new Map<string, string>(),
        cooldowns: new Map<string, number>(),
    };
});

describe('MemoryInMemState', () => {
    // We dynamically import to get a fresh reference that picks up the reset store
    async function getState() {
        // The module caches the destructured references at load time,
        // so we need to re-import after resetting globalThis.memoryStateStore.
        // vitest caches modules, so we must reset the module registry.
        vi.resetModules();
        const mod = await import('../memory');
        return mod.MemoryInMemState;
    }

    it('getUserState returns null for unknown phone', async () => {
        const state = await getState();
        const result = await state.getUserState('+5511999999999');
        expect(result).toBeNull();
    });

    it('setUserState creates new state', async () => {
        const state = await getState();
        const result = await state.setUserState('+5511000000000', {
            currentFlow: 'ONBOARDING',
            currentStep: 'WELCOME',
        });
        expect(result.phone).toBe('+5511000000000');
        expect(result.currentFlow).toBe('ONBOARDING');
        expect(result.currentStep).toBe('WELCOME');
        expect(result.lastInteraction).toBeInstanceOf(Date);
    });

    it('setUserState updates existing state', async () => {
        const state = await getState();
        await state.setUserState('+5511111111111', {
            currentFlow: 'ONBOARDING',
            currentStep: 'STEP_1',
        });
        const updated = await state.setUserState('+5511111111111', {
            currentStep: 'STEP_2',
        });
        expect(updated.currentFlow).toBe('ONBOARDING');
        expect(updated.currentStep).toBe('STEP_2');
    });

    it('clearUserState removes state', async () => {
        const state = await getState();
        await state.setUserState('+5511222222222', {
            currentFlow: 'SCHEDULING',
        });
        await state.clearUserState('+5511222222222');
        const result = await state.getUserState('+5511222222222');
        expect(result).toBeNull();
    });

    it('acquireLock returns true on first acquire', async () => {
        const state = await getState();
        const acquired = await state.acquireLock('resource-1', 'owner-a', 60);
        expect(acquired).toBe(true);
    });

    it('acquireLock returns false when already locked', async () => {
        const state = await getState();
        await state.acquireLock('resource-2', 'owner-a', 60);
        const second = await state.acquireLock('resource-2', 'owner-b', 60);
        expect(second).toBe(false);
    });

    it('releaseLock allows re-acquisition', async () => {
        const state = await getState();
        await state.acquireLock('resource-3', 'owner-a', 60);
        await state.releaseLock('resource-3');
        const reacquired = await state.acquireLock('resource-3', 'owner-b', 60);
        expect(reacquired).toBe(true);
    });

    it('setCooldown + checkCooldown returns true when in cooldown', async () => {
        const state = await getState();
        await state.setCooldown('cd-key-1', 5); // 5 minutes from now
        const inCooldown = await state.checkCooldown('cd-key-1');
        expect(inCooldown).toBe(true);
    });

    it('checkCooldown returns false when no cooldown set', async () => {
        const state = await getState();
        const result = await state.checkCooldown('nonexistent-key');
        expect(result).toBe(false);
    });

    it('getCooldownTTL returns 0 when no cooldown', async () => {
        const state = await getState();
        const ttl = await state.getCooldownTTL('no-such-key');
        expect(ttl).toBe(0);
    });

    it('getCooldownTTL returns positive seconds when cooldown is active', async () => {
        const state = await getState();
        await state.setCooldown('cd-key-2', 10); // 10 minutes
        const ttl = await state.getCooldownTTL('cd-key-2');
        expect(ttl).toBeGreaterThan(0);
        expect(ttl).toBeLessThanOrEqual(600); // 10 * 60
    });

    it('checkCooldown returns false after cooldown expires', async () => {
        const state = await getState();
        // Set cooldown that already expired (0 minutes in the future is ~now)
        // We manipulate the store directly for a deterministic test
        const g = globalThis as any;
        g.memoryStateStore.cooldowns.set('expired-key', Date.now() - 1000);

        // Re-import to pick up the modified store
        const freshState = await getState();
        const result = await freshState.checkCooldown('expired-key');
        expect(result).toBe(false);
    });

    it('setUserState preserves data field across updates', async () => {
        const state = await getState();
        await state.setUserState('+5511333333333', {
            currentFlow: 'INTAKE',
            data: { name: 'Maria' },
        });
        const updated = await state.setUserState('+5511333333333', {
            currentStep: 'CONFIRM',
        });
        // The spread merges top-level keys; data should carry over
        expect(updated.data).toEqual({ name: 'Maria' });
        expect(updated.currentStep).toBe('CONFIRM');
    });
});
