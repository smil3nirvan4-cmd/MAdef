import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { withRequestContext } from '@/lib/api/with-request-context';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { E, fail, ok } from '@/lib/api/response';
import { guardCapability } from '@/lib/auth/capability-guard';
import { buildQueueCorrelationTerms } from '@/lib/whatsapp/outbox/correlation';

function buildRetryKeys(originalIdempotencyKey: string | null, originalId: string) {
    const suffix = randomUUID();
    return {
        idempotencyKey: `retry_${Date.now()}_${originalIdempotencyKey || originalId}_${suffix}`,
        internalMessageId: `retry_${suffix}`,
    };
}

function patchPayloadWithRetryIds(payload: string, idempotencyKey: string, internalMessageId: string): string {
    try {
        const parsed = JSON.parse(payload);
        if (parsed && typeof parsed === 'object') {
            parsed.idempotencyKey = idempotencyKey;
            parsed.internalMessageId = internalMessageId;
            parsed.retryOf = parsed.retryOf || parsed.queueItemId || null;
            return JSON.stringify(parsed);
        }
        return payload;
    } catch {
        return payload;
    }
}

const postHandler = async (
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const guard = await guardCapability('RETRY_QUEUE_ITEM');
    if (guard instanceof NextResponse) return guard;

    try {
        const { id } = await params;
        const item = await prisma.whatsAppQueueItem.findUnique({ where: { id } });
        if (!item) {
            return fail(E.NOT_FOUND, 'Queue item not found', { status: 404 });
        }

        if (!['dead', 'failed'].includes(item.status)) {
            return fail(E.CONFLICT, 'Only dead/failed items can be retried', { status: 409 });
        }

        const retryKeys = buildRetryKeys(item.idempotencyKey, item.id);
        const payload = patchPayloadWithRetryIds(item.payload, retryKeys.idempotencyKey, retryKeys.internalMessageId);

        const clonedItem = await prisma.whatsAppQueueItem.create({
            data: {
                phone: item.phone,
                payload,
                status: 'pending',
                retries: 0,
                error: null,
                scheduledAt: new Date(),
                sentAt: null,
                lastAttemptAt: null,
                idempotencyKey: retryKeys.idempotencyKey,
                internalMessageId: retryKeys.internalMessageId,
                providerMessageId: null,
            },
        });

        const correlationTerms = buildQueueCorrelationTerms({
            queueItemId: clonedItem.id,
            internalMessageId: clonedItem.internalMessageId,
            idempotencyKey: clonedItem.idempotencyKey,
            resolvedMessageId: clonedItem.internalMessageId,
            phone: clonedItem.phone,
        });

        await logger.whatsapp('whatsapp_queue_retried', 'Queue item clonado para retry', {
            originalQueueItemId: item.id,
            queueItemId: clonedItem.id,
            idempotencyKey: clonedItem.idempotencyKey,
            internalMessageId: clonedItem.internalMessageId,
            correlationTerms,
        });

        return ok({ clonedItemId: clonedItem.id });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to retry queue item';
        return fail(E.DATABASE_ERROR, message, { status: 500 });
    }
};

export const POST = withRateLimit(withErrorBoundary(withRequestContext(postHandler)), { max: 10, windowMs: 60_000 });
