import { IStateManager, UserState } from '../state/types';
import { MemoryInMemState } from '../state/memory';

// Factory Logic with async initialization
let stateManager: IStateManager = MemoryInMemState;
let initialized = false;

const FORCE_MEMORY_STATE = process.env.USE_MEMORY_STATE === 'true' || process.env.USE_MOCK_DB === 'true';

async function initializeStateManager(): Promise<IStateManager> {
    if (initialized) return stateManager;

    if (FORCE_MEMORY_STATE) {
        console.warn('⚠️ [State] Using In-Memory State Manager (Forced via Env Var)');
        stateManager = MemoryInMemState;
        initialized = true;
        return stateManager;
    }

    // Auto-detect: Se não tem DATABASE_URL, usa Memory
    if (!process.env.DATABASE_URL) {
        console.warn('⚠️ [State] No DATABASE_URL found. Using In-Memory State Manager.');
        stateManager = MemoryInMemState;
        initialized = true;
        return stateManager;
    }

    try {
        // Dynamic ESM import for conditional loading
        const prismaModule = await import('../state/prisma');
        stateManager = prismaModule.PrismaState;
        console.log('✅ [State] Using Prisma Database State');
        initialized = true;
        return stateManager;
    } catch (_e) {
        console.warn('⚠️ [State] Using In-Memory State Manager (Fallback)');
        console.warn('   For production, configure REDIS_URL or ensure Prisma is available');
        stateManager = MemoryInMemState;
        initialized = true;
        return stateManager;
    }
}

// Initialize immediately (fire and forget for hot path)
initializeStateManager();

// Re-export interface for types
export type { UserState };

// Facade functions matching old API
export async function getUserState(phone: string) {
    return stateManager.getUserState(phone);
}

export async function setUserState(phone: string, state: Partial<UserState>) {
    return stateManager.setUserState(phone, state);
}

export async function clearUserState(phone: string) {
    return stateManager.clearUserState(phone);
}

export async function acquireSlotLock(slotId: string, cuidadorId: string): Promise<boolean> {
    return stateManager.acquireLock(`slot:${slotId}`, cuidadorId, 30);
}

export async function releaseSlotLock(slotId: string) {
    return stateManager.releaseLock(`slot:${slotId}`);
}

export async function setCooldown(cuidadorId: string, minutes: number) {
    return stateManager.setCooldown(`cooldown:${cuidadorId}`, minutes);
}

export async function checkCooldown(cuidadorId: string): Promise<boolean> {
    return stateManager.checkCooldown(`cooldown:${cuidadorId}`);
}

export async function getCooldownTTL(cuidadorId: string): Promise<number> {
    return stateManager.getCooldownTTL(`cooldown:${cuidadorId}`);
}
