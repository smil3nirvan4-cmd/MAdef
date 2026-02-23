import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { withRequestContext } from '@/lib/api/with-request-context';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { ok } from '@/lib/api/response';
import { NotFoundError, ConflictError } from '@/lib/errors';
import { guardCapability } from '@/lib/auth/capability-guard';
import { buildQueueCorrelationTerms } from '@/lib/whatsapp/outbox/correlation';

const ALLOWED_CANCEL_STATUSES = new Set(['dead', 'failed', 'pending', 'retrying', 'canceled']);

const postHandler = async (
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const guard = await guardCapability('CANCEL_QUEUE_ITEM');
    if (guard instanceof NextResponse) return guard;

    const { id } = await params;
    const item = await prisma.whatsAppQueueItem.findUnique({ where: { id } });
    if (!item) {
        throw new NotFoundError('Queue item', id);
    }

    if (!ALLOWED_CANCEL_STATUSES.has(item.status)) {
        throw new ConflictError('Cannot cancel sending/sent queue items');
    }

    const updated = await prisma.whatsAppQueueItem.update({
        where: { id },
        data: {
            status: 'canceled',
            scheduledAt: null,
        },
    });

    const correlationTerms = buildQueueCorrelationTerms({
        queueItemId: updated.id,
        internalMessageId: updated.internalMessageId,
        idempotencyKey: updated.idempotencyKey,
        providerMessageId: updated.providerMessageId,
        resolvedMessageId: updated.providerMessageId || updated.internalMessageId,
        phone: updated.phone,
    });

    await logger.whatsapp('whatsapp_queue_cancelled', 'Queue item cancelado', {
        queueItemId: updated.id,
        status: updated.status,
        idempotencyKey: updated.idempotencyKey,
        internalMessageId: updated.internalMessageId,
        providerMessageId: updated.providerMessageId,
        resolvedMessageId: updated.providerMessageId || updated.internalMessageId,
        correlationTerms,
    });

    return ok({ cancelled: true, itemId: updated.id });
};

export const POST = withRateLimit(withErrorBoundary(withRequestContext(postHandler)), { max: 10, windowMs: 60_000 });
