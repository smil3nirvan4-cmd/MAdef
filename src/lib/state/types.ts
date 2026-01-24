export interface UserState {
    phone: string;
    currentFlow: string;
    currentStep: string;
    data: Record<string, any>;
    lastInteraction: Date;
}

export interface IStateManager {
    getUserState(phone: string): Promise<UserState | null>;
    setUserState(phone: string, state: Partial<UserState>): Promise<UserState>;
    clearUserState(phone: string): Promise<void>;

    // Concurrency/Logic features
    acquireLock(resourceId: string, ownerId: string, ttlSeconds: number): Promise<boolean>;
    releaseLock(resourceId: string): Promise<void>;

    setCooldown(key: string, minutes: number): Promise<void>;
    checkCooldown(key: string): Promise<boolean>;
    getCooldownTTL(key: string): Promise<number>;
}
