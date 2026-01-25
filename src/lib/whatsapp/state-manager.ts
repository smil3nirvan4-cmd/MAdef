import { IStateManager, UserState } from '../state/types';
import { MemoryInMemState } from '../state/memory';

// Factory Logic
let stateManager: IStateManager;

const FORCE_MEMORY_STATE = process.env.USE_MEMORY_STATE === 'true';
const REDIS_URL = process.env.REDIS_URL;

function initializeStateManager(): IStateManager {
    if (FORCE_MEMORY_STATE) {
        console.warn('⚠️ [State] Using In-Memory State Manager (Forced via Env Var)');
        return MemoryInMemState;
    }

    if (REDIS_URL && process.env.NODE_ENV === 'production') {
        console.log('🔴 [State] Redis URL configured - Redis state manager recommended for production');
        console.log('   Configure Redis implementation for better scalability');
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { PrismaState } = require('../state/prisma');
        stateManager = PrismaState;
        console.log('✅ [State] Using Prisma Database State');
        return PrismaState;
    } catch (e) {
        console.warn('⚠️ [State] Using In-Memory State Manager (Fallback)');
        console.warn('   For production, configure REDIS_URL or ensure Prisma is available');
        return MemoryInMemState;
    }
}

stateManager = initializeStateManager();

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
