import { IStateManager, UserState } from './types';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const PrismaState: IStateManager = {
    async getUserState(phone: string) {
        const record = await prisma.whatsAppFlowState.findUnique({
            where: { phone }
        });
        if (!record) return null;

        return {
            phone: record.phone,
            currentFlow: record.currentFlow,
            currentStep: record.currentStep,
            data: JSON.parse(record.data),
            lastInteraction: record.lastInteraction
        };
    },

    async setUserState(phone: string, update: Partial<UserState>) {
        const current = await PrismaState.getUserState(phone) || {
            phone,
            currentFlow: 'IDLE',
            currentStep: '',
            data: {},
            lastInteraction: new Date()
        };

        const updated = { ...current, ...update, lastInteraction: new Date() };

        await prisma.whatsAppFlowState.upsert({
            where: { phone },
            update: {
                currentFlow: updated.currentFlow,
                currentStep: updated.currentStep,
                data: JSON.stringify(updated.data),
                lastInteraction: updated.lastInteraction
            },
            create: {
                phone,
                currentFlow: updated.currentFlow,
                currentStep: updated.currentStep,
                data: JSON.stringify(updated.data),
                lastInteraction: updated.lastInteraction
            }
        });

        return updated;
    },

    async clearUserState(phone: string) {
        try {
            await prisma.whatsAppFlowState.delete({ where: { phone } });
        } catch (e) {
            // Ignore if not found
        }
    },

    // Locks and Cooldowns can still use Memory or Redis in hybrid approach, 
    // or implement a DB table for Locks if strict persistence needed.
    // For now, falling back to an in-memory Map for high-frequency locks to avoid DB lock contention/latency,
    // as suggested in the plan "State Management: Robust Interface (Memory/DB)".
    // Ideally, for Enterprise, we'd use Redis here. Since we lack Redis, DB is too slow for 30s locks? 
    // Actually, DB is fine for this scale, but let's use the same Memory store for locks to keep it simple without extra tables.

    async acquireLock(resourceId: string, ownerId: string, ttlSeconds: number) {
        try {
            const now = new Date();
            const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

            // Cleanup expired lock if exists
            await prisma.whatsAppLock.deleteMany({
                where: {
                    resourceId,
                    expiresAt: { lt: now }
                }
            });

            // Try to create the lock
            await prisma.whatsAppLock.create({
                data: {
                    resourceId,
                    ownerId,
                    expiresAt
                }
            });
            return true;
        } catch (e) {
            // Lock already exists and is not expired
            return false;
        }
    },

    async releaseLock(resourceId: string) {
        try {
            await prisma.whatsAppLock.delete({ where: { resourceId } });
        } catch (e) {
            // Ignore if not found
        }
    },

    async setCooldown(key: string, minutes: number) {
        const expiresAt = new Date(Date.now() + minutes * 60 * 1000);
        await prisma.whatsAppCooldown.upsert({
            where: { key },
            update: { expiresAt },
            create: { key, expiresAt }
        });
    },

    async checkCooldown(key: string) {
        const record = await prisma.whatsAppCooldown.findUnique({
            where: { key }
        });

        if (!record) return false;

        if (record.expiresAt < new Date()) {
            await prisma.whatsAppCooldown.delete({ where: { key } });
            return false;
        }
        return true;
    },

    async getCooldownTTL(key: string) {
        const record = await prisma.whatsAppCooldown.findUnique({
            where: { key }
        });

        if (!record) return 0;
        const remaining = Math.ceil((record.expiresAt.getTime() - Date.now()) / 1000);
        return remaining > 0 ? remaining : 0;
    }
};

