import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { processWhatsAppOutboxOnce } from '@/lib/whatsapp/outbox/worker';

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

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const item = await prisma.whatsAppQueueItem.findUnique({ where: { id } });
        if (!item) {
            return NextResponse.json({ success: false, error: 'Queue item nao encontrado' }, { status: 404 });
        }

        const payload = parsePayload(item.payload);
        const correlationTerms = [id, item.internalMessageId, item.idempotencyKey].filter(Boolean) as string[];
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

        return NextResponse.json({
            success: true,
            item: {
                ...item,
                intent: String(payload?.intent || 'UNKNOWN'),
                preview: parsePreview(item.payload),
                payloadParsed: payload,
                resolvedMessageId: item.providerMessageId || item.internalMessageId || null,
            },
            timeline,
            logs,
        });
    } catch (error) {
        console.error('[API] queue item GET erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao carregar queue item' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const parsed = actionSchema.parse(body || {});

        const current = await prisma.whatsAppQueueItem.findUnique({ where: { id } });
        if (!current) {
            return NextResponse.json({ success: false, error: 'Queue item nao encontrado' }, { status: 404 });
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
            return NextResponse.json({ success: true, item: updated, worker });
        }

        if (parsed.action === 'cancel') {
            const updated = await prisma.whatsAppQueueItem.update({
                where: { id },
                data: {
                    status: 'canceled',
                    scheduledAt: null,
                },
            });
            return NextResponse.json({ success: true, item: updated });
        }

        const worker = await processWhatsAppOutboxOnce({ limit: 20 });
        const updated = await prisma.whatsAppQueueItem.findUnique({ where: { id } });
        return NextResponse.json({ success: true, item: updated, worker });
    } catch (error) {
        console.error('[API] queue item POST erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao executar acao no queue item' }, { status: 500 });
    }
}

