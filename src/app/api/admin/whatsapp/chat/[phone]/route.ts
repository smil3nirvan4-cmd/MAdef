export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeOutboundPhoneBR } from '@/lib/phone-validator';
import { enqueueWhatsAppTextJob } from '@/lib/whatsapp/outbox/service';
import { processWhatsAppOutboxOnce } from '@/lib/whatsapp/outbox/worker';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { guardCapability } from '@/lib/auth/capability-guard';

async function handleGet(
    _request: NextRequest,
    { params }: { params: Promise<{ phone: string }> }
) {
    const guard = await guardCapability('VIEW_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    try {
        const { phone } = await params;

        const messages = await prisma.mensagem.findMany({
            where: { telefone: { contains: phone } },
            orderBy: { timestamp: 'asc' },
            take: 500,
        });

        const cuidador = await prisma.cuidador.findUnique({ where: { telefone: phone } });
        const paciente = await prisma.paciente.findUnique({ where: { telefone: phone } });
        const flowState = await prisma.whatsAppFlowState.findFirst({
            where: { phone: { contains: phone } },
        });

        return NextResponse.json({
            success: true,
            contact: {
                phone,
                name: cuidador?.nome || paciente?.nome || phone,
                type: cuidador ? 'cuidador' : paciente ? 'paciente' : 'unknown',
                entity: cuidador || paciente,
                flowState,
            },
            messages,
            stats: {
                totalMessages: messages.length,
                firstMessage: messages[0]?.timestamp,
                lastMessage: messages[messages.length - 1]?.timestamp,
            },
        });
    } catch (error) {
        console.error('[API] chat GET erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao carregar conversa' }, { status: 500 });
    }
}

async function handlePost(
    request: NextRequest,
    { params }: { params: Promise<{ phone: string }> }
) {
    const guard = await guardCapability('SEND_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    try {
        const { phone } = await params;
        const body = await request.json();
        const message = body?.message ? String(body.message) : '';

        if (!message) {
            return NextResponse.json({ success: false, error: 'Mensagem e obrigatoria' }, { status: 400 });
        }

        const normalized = normalizeOutboundPhoneBR(phone);
        const targetJid = normalized.isValid ? normalized.jid : (phone.includes('@') ? phone : `${phone}@s.whatsapp.net`);

        const queued = await enqueueWhatsAppTextJob({
            phone,
            text: message,
            context: {
                source: 'admin_whatsapp_chat',
            },
            metadata: {
                preview: message.substring(0, 80),
            },
        });

        const logMessage = await prisma.mensagem.create({
            data: {
                telefone: targetJid,
                conteudo: message,
                direcao: 'OUT_PENDING',
                flow: 'MANUAL',
                step: 'QUEUE',
            },
        });

        const worker = await processWhatsAppOutboxOnce({ limit: 10 });
        const queueItem = await prisma.whatsAppQueueItem.findUnique({ where: { id: queued.queueItemId } });

        const finalDirection = queueItem?.status === 'sent'
            ? 'OUT'
            : queueItem?.status === 'dead'
                ? 'OUT_FAILED'
                : 'OUT_PENDING';

        await prisma.mensagem.update({
            where: { id: logMessage.id },
            data: {
                direcao: finalDirection,
                step: queueItem?.status || 'QUEUE',
            },
        });

        await prisma.systemLog.create({
            data: {
                type: 'INFO',
                action: 'manual_message_queue',
                message: `Mensagem manual enfileirada para ${phone}`,
                metadata: JSON.stringify({
                    phone,
                    queueItemId: queued.queueItemId,
                    idempotencyKey: queued.idempotencyKey,
                    internalMessageId: queued.internalMessageId,
                    queueStatus: queueItem?.status,
                    worker,
                }),
            },
        });

        const success = queueItem?.status === 'sent';
        if (!success) {
            return NextResponse.json(
                {
                    success: false,
                    error: queueItem?.error || 'Mensagem enfileirada para retry',
                    queueItemId: queued.queueItemId,
                    status: queueItem?.status || 'pending',
                    internalMessageId: queued.internalMessageId,
                },
                { status: 202 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Mensagem enviada',
            queueItemId: queued.queueItemId,
            messageId: queueItem?.providerMessageId || queued.internalMessageId,
            internalMessageId: queued.internalMessageId,
            status: queueItem?.status,
        });
    } catch (error) {
        console.error('[API] chat POST erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao enfileirar mensagem' }, { status: 500 });
    }
}

export const GET = withErrorBoundary(handleGet);
export const POST = withErrorBoundary(handlePost);
