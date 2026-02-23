import { prisma } from '@/lib/prisma';
import type { NextRequest } from 'next/server';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LGPD_ANONYMIZE' | 'LGPD_EXPORT';

export interface AuditParams {
    entity: string;
    entityId: string;
    action: AuditAction;
    changes?: Record<string, { old: unknown; new: unknown }>;
    userId?: string;
    userEmail?: string;
    req?: NextRequest;
}

export async function logAudit(params: AuditParams): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                entity: params.entity,
                entityId: params.entityId,
                action: params.action,
                changes: params.changes ? JSON.stringify(params.changes) : null,
                userId: params.userId,
                userEmail: params.userEmail,
                ipAddress: params.req?.headers.get('x-forwarded-for') ?? params.req?.headers.get('x-real-ip') ?? undefined,
                userAgent: params.req?.headers.get('user-agent') ?? undefined,
            },
        });
    } catch {
        // Audit logging should never break the main flow
        console.error('[AuditLog] Failed to write audit log', params.entity, params.entityId);
    }
}

export function diffChanges(
    before: Record<string, unknown>,
    after: Record<string, unknown>,
): Record<string, { old: unknown; new: unknown }> | undefined {
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    for (const key of Object.keys(after)) {
        if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
            changes[key] = { old: before[key], new: after[key] };
        }
    }
    return Object.keys(changes).length > 0 ? changes : undefined;
}
