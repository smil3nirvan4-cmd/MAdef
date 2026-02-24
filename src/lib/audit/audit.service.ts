import { prisma } from '@/lib/prisma';
import { RequestContext } from '@/lib/observability/request-context';

export interface AuditEntry {
    entity: string;
    entityId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ANONYMIZE';
    changes?: Record<string, unknown>;
    userId?: string;
}

/**
 * Log an audit entry to the AuditLog table.
 * Automatically captures requestId from the current request context.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                entity: entry.entity,
                entityId: entry.entityId,
                action: entry.action,
                changes: entry.changes ? JSON.stringify(entry.changes) : null,
                userId: entry.userId,
                requestId: RequestContext.getRequestId() || undefined,
            },
        });
    } catch {
        // Swallow audit errors to never break business operations
    }
}

/**
 * Compute a simple diff between two objects for audit logging.
 */
export function computeChanges(
    before: Record<string, unknown>,
    after: Record<string, unknown>,
): Record<string, { from: unknown; to: unknown }> {
    const diff: Record<string, { from: unknown; to: unknown }> = {};
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of keys) {
        if (key === 'updatedAt' || key === 'createdAt') continue;
        const oldVal = before[key];
        const newVal = after[key];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            diff[key] = { from: oldVal, to: newVal };
        }
    }

    return diff;
}
