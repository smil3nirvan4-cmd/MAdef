import { IStateManager, UserState } from './types';

import * as fs from 'fs';
import * as path from 'path';

// Arquivo de persistência
const STATE_FILE = path.resolve(process.cwd(), '.wa-state.json');

// Helper para salvar
function saveToDisk(map: Map<string, string>) {
    try {
        const obj = Object.fromEntries(map);
        fs.writeFileSync(STATE_FILE, JSON.stringify(obj, null, 2));
    } catch (_e) {
        console.error('Erro ao salvar estado:', _e);
    }
}

// Helper para carregar
function loadFromDisk(): Map<string, string> {
    try {
        if (fs.existsSync(STATE_FILE)) {
            const data = fs.readFileSync(STATE_FILE, 'utf-8');
            return new Map(Object.entries(JSON.parse(data)));
        }
    } catch (_e) {
        console.error('Erro ao carregar estado:', _e);
    }
    return new Map();
}

// Global storage
const globalState = globalThis as any;
if (!globalState.memoryStateStore) {
    // Tenta carregar do disco primeiro
    const loadedStates = loadFromDisk();

    globalState.memoryStateStore = {
        states: loadedStates,
        locks: new Map<string, string>(),
        cooldowns: new Map<string, number>(),
    };
    console.log(`📦 Estado carregado de ${STATE_FILE} (${loadedStates.size} registros)`);
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

        // Persiste no arquivo
        saveToDisk(states);

        return updated;
    },

    async clearUserState(phone: string) {
        states.delete(`state:${phone}`);
        saveToDisk(states);
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
