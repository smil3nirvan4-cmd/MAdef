export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeOutboundPhoneBR } from '@/lib/phone-validator';
import { enqueueWhatsAppTextJob, enqueueWhatsAppDocumentJob } from '@/lib/whatsapp/outbox/service';
import { processWhatsAppOutboxOnce } from '@/lib/whatsapp/outbox/worker';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ phone: string }> }
) {
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
                entityId: cuidador?.id || paciente?.id || null,
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

async function sendTextMessage(phone: string, message: string) {
    const normalized = normalizeOutboundPhoneBR(phone);
    const targetJid = normalized.isValid ? normalized.jid : (phone.includes('@') ? phone : `${phone}@s.whatsapp.net`);

    const queued = await enqueueWhatsAppTextJob({
        phone,
        text: message,
        context: { source: 'admin_whatsapp_chat' },
        metadata: { preview: message.substring(0, 80) },
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
        data: { direcao: finalDirection, step: queueItem?.status || 'QUEUE' },
    });

    return { queued, queueItem, worker };
}

async function sendMediaMessage(phone: string, fileBase64: string, fileName: string, mimeType: string, caption: string) {
    const normalized = normalizeOutboundPhoneBR(phone);
    const targetJid = normalized.isValid ? normalized.jid : (phone.includes('@') ? phone : `${phone}@s.whatsapp.net`);

    const contentLabel = caption
        ? `[${mimeType.startsWith('image/') ? 'Imagem' : mimeType.startsWith('audio/') ? 'Audio' : 'Documento'}] ${caption}`
        : `[${mimeType.startsWith('image/') ? 'Imagem' : mimeType.startsWith('audio/') ? 'Audio' : 'Documento'}] ${fileName}`;

    const queued = await enqueueWhatsAppDocumentJob({
        phone,
        documentBase64: fileBase64,
        fileName,
        mimeType,
        caption,
        context: { source: 'admin_whatsapp_chat' },
        metadata: { preview: contentLabel.substring(0, 80) },
    });

    const logMessage = await prisma.mensagem.create({
        data: {
            telefone: targetJid,
            conteudo: contentLabel,
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
        data: { direcao: finalDirection, step: queueItem?.status || 'QUEUE' },
    });

    return { queued, queueItem, worker };
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ phone: string }> }
) {
    try {
        const { phone } = await params;
        const body = await request.json();

        const messageType = body?.type || 'text';
        const message = body?.message ? String(body.message) : '';

        if (messageType === 'text') {
            if (!message) {
                return NextResponse.json({ success: false, error: 'Mensagem e obrigatoria' }, { status: 400 });
            }

            const { queued, queueItem } = await sendTextMessage(phone, message);

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
        }

        // Media message (image, audio, document)
        const fileBase64 = body?.fileBase64 ? String(body.fileBase64) : '';
        const fileName = body?.fileName ? String(body.fileName) : 'file';
        const mimeType = body?.mimeType ? String(body.mimeType) : 'application/octet-stream';
        const caption = body?.caption ? String(body.caption) : '';

        if (!fileBase64) {
            return NextResponse.json({ success: false, error: 'Arquivo e obrigatorio' }, { status: 400 });
        }

        const { queued, queueItem } = await sendMediaMessage(phone, fileBase64, fileName, mimeType, caption);

        await prisma.systemLog.create({
            data: {
                type: 'INFO',
                action: 'manual_media_queue',
                message: `Midia ${messageType} enfileirada para ${phone}: ${fileName}`,
                metadata: JSON.stringify({
                    phone,
                    messageType,
                    fileName,
                    mimeType,
                    queueItemId: queued.queueItemId,
                    queueStatus: queueItem?.status,
                }),
            },
        });

        const success = queueItem?.status === 'sent';
        return NextResponse.json({
            success,
            message: success ? 'Midia enviada' : 'Midia enfileirada para retry',
            queueItemId: queued.queueItemId,
            status: queueItem?.status || 'pending',
        }, { status: success ? 200 : 202 });
    } catch (error) {
        console.error('[API] chat POST erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao enfileirar mensagem' }, { status: 500 });
    }
}
