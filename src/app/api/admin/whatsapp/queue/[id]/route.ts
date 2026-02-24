export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { processWhatsAppOutboxOnce } from '@/lib/whatsapp/outbox/worker';
import { buildQueueCorrelationTerms } from '@/lib/whatsapp/outbox/correlation';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { guardCapability } from '@/lib/auth/capability-guard';
import { E, fail, ok } from '@/lib/api/response';

const actionSchema = z.object({
    action: z.enum(['reprocess', 'cancel', 'process']),
});

function parsePayload(payload: string): any {
    try {
        return JSON.parse(payload);
    } catch {
        return null;
    }
}

function parsePreview(payload: string): string {
    const parsed = parsePayload(payload);
    if (typeof parsed?.text === 'string' && parsed.text.trim()) return parsed.text.trim();
    if (typeof parsed?.caption === 'string' && parsed.caption.trim()) return parsed.caption.trim();
    if (parsed?.intent === 'SEND_PROPOSTA') return '[Proposta PDF]';
    if (parsed?.intent === 'SEND_CONTRATO') return '[Contrato PDF]';
    if (parsed?.intent === 'SEND_DOCUMENT') return `[Documento] ${parsed?.fileName || ''}`.trim();
    return `[${parsed?.intent || 'UNKNOWN'}]`;
}

const getHandler = async (
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const guard = await guardCapability('VIEW_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    try {
        const { id } = await params;

        const item = await prisma.whatsAppQueueItem.findUnique({ where: { id } });
        if (!item) {
            return fail(E.NOT_FOUND, 'Queue item not found', { status: 404 });
        }

        const payload = parsePayload(item.payload);
        const resolvedMessageId = item.providerMessageId || item.internalMessageId || payload?.resolvedMessageId || null;
        const correlationTerms = buildQueueCorrelationTerms({
            queueItemId: id,
            internalMessageId: item.internalMessageId || payload?.internalMessageId,
            idempotencyKey: item.idempotencyKey || payload?.idempotencyKey,
            providerMessageId: item.providerMessageId || payload?.providerMessageId,
            resolvedMessageId,
            phone: item.phone || payload?.phone || payload?.to || null,
            jid: payload?.jid || null,
        });

        const logs = correlationTerms.length
            ? await prisma.systemLog.findMany({
                where: {
                    OR: correlationTerms.map((term) => ({ metadata: { contains: term } })),
                },
                orderBy: { createdAt: 'desc' },
                take: 100,
            })
            : [];

        const timeline = [
            { event: 'created', status: 'pending', at: item.createdAt },
            ...(item.lastAttemptAt ? [{ event: 'attempt', status: 'sending', at: item.lastAttemptAt }] : []),
            ...(item.sentAt ? [{ event: 'sent', status: 'sent', at: item.sentAt }] : []),
            ...((item.status === 'dead' || item.status === 'canceled' || item.status === 'retrying')
                ? [{ event: item.status, status: item.status, at: item.updatedAt }]
                : []),
        ];

        return ok({
            item: {
                ...item,
                intent: String(payload?.intent || 'UNKNOWN'),
                preview: parsePreview(item.payload),
                payloadParsed: payload,
                resolvedMessageId,
            },
            timeline,
            logs,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao carregar queue item';
        return fail(E.DATABASE_ERROR, message, { status: 500 });
    }
};

const postHandler = async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    try {
        const { id } = await params;
        const body = await request.json();
        const parsed = actionSchema.parse(body || {});

        const current = await prisma.whatsAppQueueItem.findUnique({ where: { id } });
        if (!current) {
            return fail(E.NOT_FOUND, 'Queue item not found', { status: 404 });
        }

        if (parsed.action === 'reprocess') {
            await prisma.whatsAppQueueItem.update({
                where: { id },
                data: {
                    status: 'pending',
                    error: null,
                    scheduledAt: null,
                },
            });
            const worker = await processWhatsAppOutboxOnce({ limit: 20 });
            const updated = await prisma.whatsAppQueueItem.findUnique({ where: { id } });
            return ok({ item: updated, worker });
        }

        if (parsed.action === 'cancel') {
            const updated = await prisma.whatsAppQueueItem.update({
                where: { id },
                data: {
                    status: 'canceled',
                    scheduledAt: null,
                },
            });
            return ok({ item: updated });
        }

        const worker = await processWhatsAppOutboxOnce({ limit: 20 });
        const updated = await prisma.whatsAppQueueItem.findUnique({ where: { id } });
        return ok({ item: updated, worker });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return fail(E.VALIDATION_ERROR, 'Payload invalido', { status: 400, details: error.flatten() });
        }
        const message = error instanceof Error ? error.message : 'Erro ao executar acao no queue item';
        return fail(E.DATABASE_ERROR, message, { status: 500 });
    }
};

export const GET = withErrorBoundary(getHandler);
export const POST = withErrorBoundary(postHandler);
