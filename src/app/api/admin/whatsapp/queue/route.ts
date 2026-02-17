import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { enqueueWhatsAppTextJob } from '@/lib/whatsapp/outbox/service';
import { processWhatsAppOutboxOnce } from '@/lib/whatsapp/outbox/worker';

const allowedStatuses = ['pending', 'sending', 'sent', 'retrying', 'dead', 'canceled'] as const;

const actionSchema = z.object({
    action: z.enum(['retry', 'cancel', 'clear_dead', 'clear_failed', 'reprocess', 'process']).optional(),
    ids: z.array(z.string()).optional(),
    phone: z.string().optional(),
    message: z.string().optional(),
    limit: z.number().int().positive().max(100).optional(),
});

function parsePreview(payload: string): string {
    try {
        const parsed = JSON.parse(payload);
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

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const rawStatus = searchParams.get('status');
        const phone = searchParams.get('phone') || '';
        const page = Number(searchParams.get('page') || '1');
        const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '50')));

        const where: any = {};
        if (rawStatus === 'pending') {
            where.status = { in: ['pending', 'retrying', 'sending'] };
        } else if (rawStatus === 'failed') {
            where.status = 'dead';
        } else if (rawStatus === 'sent') {
            where.status = 'sent';
        } else if (rawStatus && rawStatus !== 'all' && allowedStatuses.includes(rawStatus as any)) {
            where.status = rawStatus;
        }
        if (phone) {
            where.phone = { contains: phone.replace(/\D/g, '') };
        }

        const [items, total, grouped] = await Promise.all([
            prisma.whatsAppQueueItem.findMany({
                where,
                orderBy: [{ createdAt: 'desc' }],
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.whatsAppQueueItem.count({ where }),
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

        return NextResponse.json({
            success: true,
            queue: items.map((item) => ({
                id: item.id,
                phone: item.phone,
                telefone: `${item.phone}@s.whatsapp.net`,
                status: item.status,
                retries: item.retries,
                error: item.error,
                scheduledAt: item.scheduledAt,
                sentAt: item.sentAt,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                payload: item.payload,
                preview: parsePreview(item.payload),
                internalMessageId: item.internalMessageId,
                idempotencyKey: item.idempotencyKey,
                providerMessageId: item.providerMessageId,
                // backward compatibility fields for old UI tabs
                direcao: item.status === 'sent' ? 'OUT' : item.status === 'dead' ? 'OUT_FAILED' : 'OUT_PENDING',
                conteudo: parsePreview(item.payload),
                timestamp: item.createdAt,
            })),
            stats,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('[API] queue GET erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao listar fila' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const parsed = actionSchema.parse(body || {});
        const action = parsed.action;
        const ids = parsed.ids || [];

        // Backward-compatible enqueue for manual messages
        if (!action && parsed.phone && parsed.message) {
            const enqueue = await enqueueWhatsAppTextJob({
                phone: parsed.phone,
                text: parsed.message,
                context: { source: 'admin_queue_api' },
            });

            const worker = await processWhatsAppOutboxOnce({ limit: 10 });
            return NextResponse.json({ success: true, enqueue, worker });
        }

        if (action === 'process') {
            const result = await processWhatsAppOutboxOnce({ limit: parsed.limit || 20 });
            return NextResponse.json({ success: true, result });
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
            return NextResponse.json({ success: true, updated: result.count, worker });
        }

        if (action === 'cancel') {
            const result = await prisma.whatsAppQueueItem.updateMany({
                where: { id: { in: ids }, status: { in: ['pending', 'retrying'] } },
                data: {
                    status: 'canceled',
                    scheduledAt: null,
                },
            });
            return NextResponse.json({ success: true, updated: result.count });
        }

        if (action === 'clear_dead' || action === 'clear_failed') {
            const result = await prisma.whatsAppQueueItem.deleteMany({
                where: { status: 'dead' },
            });
            return NextResponse.json({ success: true, deleted: result.count });
        }

        return NextResponse.json({ success: false, error: 'Ação inválida' }, { status: 400 });
    } catch (error) {
        console.error('[API] queue POST erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao processar fila' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const id = String(body?.id || '');
        const status = String(body?.status || '');

        if (!id || !allowedStatuses.includes(status as any)) {
            return NextResponse.json({ success: false, error: 'id e status válidos são obrigatórios' }, { status: 400 });
        }

        const item = await prisma.whatsAppQueueItem.update({
            where: { id },
            data: { status },
        });

        return NextResponse.json({ success: true, item });
    } catch (error) {
        console.error('[API] queue PATCH erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao atualizar item da fila' }, { status: 500 });
    }
}
