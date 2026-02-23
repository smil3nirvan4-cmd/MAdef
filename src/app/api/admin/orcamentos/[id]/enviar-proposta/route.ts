export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { enqueueWhatsAppPropostaJob } from '@/lib/whatsapp/outbox/service';
import { processWhatsAppOutboxOnce } from '@/lib/whatsapp/outbox/worker';
import { parseOrcamentoSendOptions } from '@/lib/documents/send-options';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const body = await request.json().catch(() => ({}));
        let sendOptions;
        try {
            sendOptions = parseOrcamentoSendOptions(body);
        } catch (error) {
            return NextResponse.json({
                success: false,
                error: error instanceof Error ? error.message : 'Opcoes de envio invalidas',
            }, { status: 400 });
        }

        const { id } = await params;
        const orcamento = await prisma.orcamento.findUnique({
            where: { id },
            include: { paciente: true },
        });

        if (!orcamento) {
            return NextResponse.json({ success: false, error: 'Orcamento nao encontrado' }, { status: 404 });
        }

        const avaliacao = await prisma.avaliacao.findFirst({
            where: { pacienteId: orcamento.pacienteId },
            orderBy: { createdAt: 'desc' },
            select: { id: true },
        });

        const enqueue = await enqueueWhatsAppPropostaJob({
            phone: orcamento.paciente?.telefone || '',
            orcamentoId: orcamento.id,
            context: {
                source: 'admin_orcamento_enviar_proposta',
                orcamentoId: orcamento.id,
                pacienteId: orcamento.pacienteId,
                avaliacaoId: avaliacao?.id,
                sendOptions,
            },
            metadata: {
                tipo: 'PROPOSTA',
                orcamentoId: orcamento.id,
                sendOptions,
            },
            idempotencyKey: typeof body?.idempotencyKey === 'string' ? body.idempotencyKey : undefined,
        });

        const worker = await processWhatsAppOutboxOnce({ limit: 10 });
        const queueItem = await prisma.whatsAppQueueItem.findUnique({ where: { id: enqueue.queueItemId } });

        await logger.whatsapp('orcamento_proposta_enfileirada', `Proposta enfileirada para ${orcamento.paciente?.telefone}`, {
            orcamentoId: id,
            queueItemId: enqueue.queueItemId,
            status: queueItem?.status || 'pending',
            internalMessageId: enqueue.internalMessageId,
            providerMessageId: queueItem?.providerMessageId || null,
        });

        return NextResponse.json({
            success: true,
            queued: true,
            queueItemId: enqueue.queueItemId,
            internalMessageId: enqueue.internalMessageId,
            status: queueItem?.status || 'pending',
            providerMessageId: queueItem?.providerMessageId || null,
            worker,
        });
    } catch (error) {
        await logger.error('enviar_proposta_error', 'Erro ao enfileirar proposta', error instanceof Error ? error : undefined);
        return NextResponse.json({ success: false, error: 'Erro ao enfileirar proposta' }, { status: 500 });
    }
}
