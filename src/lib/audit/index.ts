import { prisma } from '@/lib/prisma';

export interface AuditLogInput {
    entity: string;
    entityId?: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    userId?: string;
}

export function computeChanges(
    before: Record<string, unknown>,
    after: Record<string, unknown>,
): Record<string, { from: unknown; to: unknown }> {
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
        const oldVal = before[key];
        const newVal = after[key];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            changes[key] = { from: oldVal, to: newVal };
        }
    }

    return changes;
}

export async function logAudit(input: AuditLogInput): Promise<void> {
    try {
        const metadata: Record<string, unknown> = {};
        if (input.before) metadata.before = input.before;
        if (input.after) metadata.after = input.after;
        if (input.action === 'UPDATE' && input.before && input.after) {
            metadata.changes = computeChanges(input.before, input.after);
        }

        await prisma.systemLog.create({
            data: {
                type: 'INFO',
                action: `${input.entity.toLowerCase()}_${input.action.toLowerCase()}`,
                message: `${input.action} ${input.entity}${input.entityId ? ` id=${input.entityId}` : ''}`,
                metadata: JSON.stringify(metadata),
                userId: input.userId,
            },
        });
    } catch {
        // Audit logging should never break the main operation
    }
}
