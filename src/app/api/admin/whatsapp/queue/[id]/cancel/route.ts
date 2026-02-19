import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { withRequestContext } from '@/lib/api/with-request-context';
import { E, fail, ok } from '@/lib/api/response';
import { guardCapability } from '@/lib/auth/capability-guard';
import { buildQueueCorrelationTerms } from '@/lib/whatsapp/outbox/correlation';

const ALLOWED_CANCEL_STATUSES = new Set(['dead', 'failed', 'pending', 'retrying', 'canceled']);

const postHandler = async (
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const guard = await guardCapability('CANCEL_QUEUE_ITEM');
    if (guard instanceof NextResponse) return guard;

    try {
        const { id } = await params;
        const item = await prisma.whatsAppQueueItem.findUnique({ where: { id } });
        if (!item) {
            return fail(E.NOT_FOUND, 'Queue item not found', { status: 404 });
        }

        if (!ALLOWED_CANCEL_STATUSES.has(item.status)) {
            return fail(E.CONFLICT, 'Cannot cancel sending/sent queue items', { status: 409 });
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
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to cancel queue item';
        return fail(E.DATABASE_ERROR, message, { status: 500 });
    }
};

export const POST = withRequestContext(postHandler);
