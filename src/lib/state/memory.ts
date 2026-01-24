import { IStateManager, UserState } from './types';

// Global storage to survive HMR in local dev
const globalState = globalThis as any;
if (!globalState.memoryStateStore) {
    globalState.memoryStateStore = {
        states: new Map<string, string>(),
        locks: new Map<string, string>(),
        cooldowns: new Map<string, number>(),
    };
}

const { states, locks, cooldowns } = globalState.memoryStateStore;

export const MemoryInMemState: IStateManager = {
    async getUserState(phone: string) {
        const data = states.get(`state:${phone}`);
        return data ? JSON.parse(data) : null;
    },

    async setUserState(phone: string, update: Partial<UserState>) {
        const current = await MemoryInMemState.getUserState(phone) || {
            phone,
            currentFlow: 'IDLE',
            currentStep: '',
            data: {},
            lastInteraction: new Date(),
        };

        const updated = { ...current, ...update, lastInteraction: new Date() };
        states.set(`state:${phone}`, JSON.stringify(updated));
        return updated;
    },

    async clearUserState(phone: string) {
        states.delete(`state:${phone}`);
    },

    async acquireLock(resourceId: string, ownerId: string, ttlSeconds: number) {
        if (locks.has(resourceId)) return false;
        locks.set(resourceId, ownerId);

        // Auto release
        setTimeout(() => {
            if (locks.get(resourceId) === ownerId) {
                locks.delete(resourceId);
            }
        }, ttlSeconds * 1000);

        return true;
    },

    async releaseLock(resourceId: string) {
        locks.delete(resourceId);
    },

    async setCooldown(key: string, minutes: number) {
        const expiry = Date.now() + (minutes * 60 * 1000);
        cooldowns.set(key, expiry);
    },

    async checkCooldown(key: string) {
        const expiry = cooldowns.get(key);
        if (!expiry) return false;
        if (Date.now() > expiry) {
            cooldowns.delete(key);
            return false;
        }
        return true;
    },

    async getCooldownTTL(key: string) {
        const expiry = cooldowns.get(key);
        if (!expiry) return 0;
        const remaining = Math.ceil((expiry - Date.now()) / 1000);
        return remaining > 0 ? remaining : 0;
    }
};
