export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { enqueueWhatsAppTextJob } from '@/lib/whatsapp/outbox/service';
import { processWhatsAppOutboxOnce } from '@/lib/whatsapp/outbox/worker';
import { OUTBOX_INTENTS } from '@/lib/whatsapp/outbox/types';
import { withRequestContext } from '@/lib/api/with-request-context';
import { E, fail, ok, paginated } from '@/lib/api/response';
import { parseFilter, parsePagination, parseSort } from '@/lib/api/query-params';
import { guardCapability } from '@/lib/auth/capability-guard';

const allowedStatuses = ['pending', 'sending', 'sent', 'retrying', 'dead', 'canceled'] as const;
const sortableFields = ['createdAt', 'scheduledAt', 'retries', 'lastAttemptAt'] as const;
const allowedIntents = [...OUTBOX_INTENTS, 'all'] as const;

const actionSchema = z.object({
    action: z.enum(['retry', 'cancel', 'clear_dead', 'clear_failed', 'reprocess', 'process']).optional(),
    ids: z.array(z.string()).optional(),
    phone: z.string().optional(),
    message: z.string().optional(),
    limit: z.number().int().positive().max(100).optional(),
});

function parsePayload(payload: string): any {
    try {
        return JSON.parse(payload);
    } catch {
        return null;
    }
}

function parseIntent(payload: string): string {
    const parsed = parsePayload(payload);
    return String(parsed?.intent || 'UNKNOWN');
}

function parsePreview(payload: string): string {
    try {
        const parsed = parsePayload(payload);
        if (typeof parsed?.text === 'string' && parsed.text.trim()) return parsed.text.trim();
        if (typeof parsed?.caption === 'string' && parsed.caption.trim()) return parsed.caption.trim();
        if (parsed?.intent === 'SEND_PROPOSTA') return '[Proposta PDF]';
        if (parsed?.intent === 'SEND_CONTRATO') return '[Contrato PDF]';
        if (parsed?.intent === 'SEND_DOCUMENT') return `[Documento] ${parsed?.fileName || ''}`.trim();
        return `[${parsed?.intent || 'UNKNOWN'}]`;
    } catch {
        return '[payload invalido]';
    }
}

function parseDate(value: string | null): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeStatusFilter(rawStatus: string | null) {
    if (rawStatus === 'pending') return { in: ['pending', 'retrying', 'sending'] };
    if (rawStatus === 'failed') return 'dead';
    if (rawStatus === 'sent') return 'sent';
    if (rawStatus && rawStatus !== 'all' && (allowedStatuses as readonly string[]).includes(rawStatus)) return rawStatus;
    return undefined;
}

const getHandler = async (request: NextRequest) => {
    try {
        const guard = await guardCapability('VIEW_WHATSAPP');
        if (guard instanceof NextResponse) return guard;

        const url = new URL(request.url);
        const { searchParams } = url;
        const { page, pageSize } = parsePagination(url);
        const { field: sortBy, direction: sortDir } = parseSort(url, [...sortableFields], 'createdAt', 'desc');
        const parsedFilters = parseFilter(url, ['status', 'intent', 'phone', 'idempotencyKey']);

        const rawStatus = parsedFilters.status ?? searchParams.get('status');
        const phone = parsedFilters.phone ?? searchParams.get('phone') ?? '';
        const intent = parsedFilters.intent ?? searchParams.get('intent') ?? 'all';
        const idempotencyKey = parsedFilters.idempotencyKey ?? searchParams.get('idempotencyKey') ?? '';
        const retriesMin = Number(searchParams.get('retriesMin') || '');
        const retriesMax = Number(searchParams.get('retriesMax') || '');
        const createdFrom = parseDate(searchParams.get('createdFrom'));
        const createdTo = parseDate(searchParams.get('createdTo'));
        const scheduledFrom = parseDate(searchParams.get('scheduledFrom'));
        const scheduledTo = parseDate(searchParams.get('scheduledTo'));
        const lastAttemptFrom = parseDate(searchParams.get('lastAttemptFrom'));
        const lastAttemptTo = parseDate(searchParams.get('lastAttemptTo'));

        const where: { AND: Record<string, unknown>[] } = { AND: [] };
        const statusFilter = normalizeStatusFilter(rawStatus);
        if (statusFilter) where.AND.push({ status: statusFilter });
        if (phone) where.AND.push({ phone: { contains: phone.replace(/\D/g, '') } });
        if (idempotencyKey) where.AND.push({ idempotencyKey: { contains: idempotencyKey } });
        if (intent && (allowedIntents as readonly string[]).includes(intent) && intent !== 'all') {
            where.AND.push({ payload: { contains: `"intent":"${intent}"` } });
        }
        if (!Number.isNaN(retriesMin)) where.AND.push({ retries: { gte: retriesMin } });
        if (!Number.isNaN(retriesMax)) where.AND.push({ retries: { lte: retriesMax } });

        if (createdFrom || createdTo) {
            where.AND.push({
                createdAt: {
                    ...(createdFrom ? { gte: createdFrom } : {}),
                    ...(createdTo ? { lte: createdTo } : {}),
                },
            });
        }

        if (scheduledFrom || scheduledTo) {
            where.AND.push({
                scheduledAt: {
                    ...(scheduledFrom ? { gte: scheduledFrom } : {}),
                    ...(scheduledTo ? { lte: scheduledTo } : {}),
                },
            });
        }

        if (lastAttemptFrom || lastAttemptTo) {
            where.AND.push({
                lastAttemptAt: {
                    ...(lastAttemptFrom ? { gte: lastAttemptFrom } : {}),
                    ...(lastAttemptTo ? { lte: lastAttemptTo } : {}),
                },
            });
        }

        const prismaWhere = where.AND.length > 0 ? where : {};

        const [items, total, grouped] = await Promise.all([
            prisma.whatsAppQueueItem.findMany({
                where: prismaWhere,
                orderBy: [{ [sortBy]: sortDir }, { createdAt: 'desc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.whatsAppQueueItem.count({ where: prismaWhere }),
            prisma.whatsAppQueueItem.groupBy({
                by: ['status'],
                _count: { _all: true },
            }),
        ]);

        const stats = {
            pending: 0,
            sending: 0,
            sent: 0,
            retrying: 0,
            dead: 0,
            failed: 0,
            canceled: 0,
        };

        for (const row of grouped) {
            if ((row.status as string) in stats) {
                stats[row.status as keyof typeof stats] = row._count._all;
            }
        }
        stats.failed = stats.dead;

        const mapped = items.map((item) => ({
            id: item.id,
            phone: item.phone,
            telefone: `${item.phone}@s.whatsapp.net`,
            status: item.status,
            retries: item.retries,
            error: item.error,
            scheduledAt: item.scheduledAt,
            sentAt: item.sentAt,
            lastAttemptAt: item.lastAttemptAt,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            payload: item.payload,
            intent: parseIntent(item.payload),
            preview: parsePreview(item.payload),
            internalMessageId: item.internalMessageId,
            idempotencyKey: item.idempotencyKey,
            providerMessageId: item.providerMessageId,
            resolvedMessageId: item.providerMessageId || item.internalMessageId || null,
            direcao: item.status === 'sent' ? 'OUT' : item.status === 'dead' ? 'OUT_FAILED' : 'OUT_PENDING',
            conteudo: parsePreview(item.payload),
            timestamp: item.createdAt,
        }));

        return paginated(
            mapped,
            {
                page,
                pageSize,
                total,
            },
            200,
            {
                stats,
                filters: {
                    status: rawStatus || 'all',
                    intent,
                    idempotencyKey,
                    phone,
                    retriesMin: Number.isNaN(retriesMin) ? null : retriesMin,
                    retriesMax: Number.isNaN(retriesMax) ? null : retriesMax,
                    createdFrom: createdFrom?.toISOString() || null,
                    createdTo: createdTo?.toISOString() || null,
                    scheduledFrom: scheduledFrom?.toISOString() || null,
                    scheduledTo: scheduledTo?.toISOString() || null,
                    lastAttemptFrom: lastAttemptFrom?.toISOString() || null,
                    lastAttemptTo: lastAttemptTo?.toISOString() || null,
                    sortBy,
                    sortDir,
                },
            }
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao listar fila';
        return fail(E.DATABASE_ERROR, message, { status: 500 });
    }
};

const postHandler = async (request: NextRequest) => {
    try {
        const guard = await guardCapability('MANAGE_WHATSAPP');
        if (guard instanceof NextResponse) return guard;

        const body = await request.json();
        const parsed = actionSchema.parse(body || {});
        const action = parsed.action;
        const ids = parsed.ids || [];

        if (!action && parsed.phone && parsed.message) {
            const enqueue = await enqueueWhatsAppTextJob({
                phone: parsed.phone,
                text: parsed.message,
                context: { source: 'admin_queue_api' },
            });

            const worker = await processWhatsAppOutboxOnce({ limit: 10 });
            return ok({ enqueue, worker });
        }

        if (action === 'process') {
            const result = await processWhatsAppOutboxOnce({ limit: parsed.limit || 20 });
            return ok({ result });
        }

        if (action === 'retry' || action === 'reprocess') {
            const result = await prisma.whatsAppQueueItem.updateMany({
                where: { id: { in: ids } },
                data: {
                    status: 'pending',
                    error: null,
                    scheduledAt: null,
                },
            });

            const worker = await processWhatsAppOutboxOnce({ limit: 20 });
            return ok({ updated: result.count, worker });
        }

        if (action === 'cancel') {
            const result = await prisma.whatsAppQueueItem.updateMany({
                where: { id: { in: ids }, status: { in: ['pending', 'retrying'] } },
                data: {
                    status: 'canceled',
                    scheduledAt: null,
                },
            });
            return ok({ updated: result.count });
        }

        if (action === 'clear_dead' || action === 'clear_failed') {
            const result = await prisma.whatsAppQueueItem.deleteMany({
                where: { status: 'dead' },
            });
            return ok({ deleted: result.count });
        }

        return fail(E.VALIDATION_ERROR, 'Acao invalida', { status: 400 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return fail(E.VALIDATION_ERROR, 'Payload invalido', { status: 400, details: error.flatten() });
        }
        const message = error instanceof Error ? error.message : 'Erro ao processar fila';
        return fail(E.DATABASE_ERROR, message, { status: 500 });
    }
};

const patchHandler = async (request: NextRequest) => {
    try {
        const guard = await guardCapability('MANAGE_WHATSAPP');
        if (guard instanceof NextResponse) return guard;

        const body = await request.json();
        const id = String(body?.id || '');
        const status = String(body?.status || '');

        if (!id || !(allowedStatuses as readonly string[]).includes(status)) {
            return fail(E.VALIDATION_ERROR, 'id e status validos sao obrigatorios', { status: 400 });
        }

        const item = await prisma.whatsAppQueueItem.update({
            where: { id },
            data: { status },
        });

        return ok({ item });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao atualizar item da fila';
        return fail(E.DATABASE_ERROR, message, { status: 500 });
    }
};

export const GET = withRequestContext(getHandler);
export const POST = withRequestContext(postHandler);
export const PATCH = withRequestContext(patchHandler);
