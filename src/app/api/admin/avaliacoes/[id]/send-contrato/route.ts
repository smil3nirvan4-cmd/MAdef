import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { enqueueWhatsAppContratoJob } from '@/lib/whatsapp/outbox/service';
import { processWhatsAppOutboxOnce } from '@/lib/whatsapp/outbox/worker';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: avaliacaoId } = await params;
        const body = await request.json().catch(() => ({}));

        const avaliacao = await prisma.avaliacao.findUnique({
            where: { id: avaliacaoId },
            include: { paciente: true },
        });

        if (!avaliacao) {
            return NextResponse.json({ success: false, error: 'Avaliacao nao encontrada' }, { status: 404 });
        }

        const orcamento = body?.orcamentoId
            ? await prisma.orcamento.findUnique({ where: { id: String(body.orcamentoId) } })
            : await prisma.orcamento.findFirst({
                where: { pacienteId: avaliacao.pacienteId },
                orderBy: { createdAt: 'desc' },
            });

        if (!orcamento) {
            return NextResponse.json({ success: false, error: 'Orcamento nao encontrado para esta avaliacao' }, { status: 404 });
        }

        const enqueue = await enqueueWhatsAppContratoJob({
            phone: avaliacao.paciente.telefone,
            orcamentoId: orcamento.id,
            context: {
                source: 'admin_send_contrato',
                avaliacaoId,
                pacienteId: avaliacao.pacienteId,
                orcamentoId: orcamento.id,
            },
            metadata: {
                tipo: 'CONTRATO',
                avaliacaoId,
                orcamentoId: orcamento.id,
            },
            idempotencyKey: body?.idempotencyKey,
        });

        const worker = await processWhatsAppOutboxOnce({ limit: 10 });
        const queueItem = await prisma.whatsAppQueueItem.findUnique({ where: { id: enqueue.queueItemId } });

        await logger.whatsapp('avaliacao_send_contrato_enqueued', `Contrato enfileirado para avaliacao ${avaliacaoId}`, {
            avaliacaoId,
            orcamentoId: orcamento.id,
            queueItemId: enqueue.queueItemId,
            status: queueItem?.status || 'pending',
        });

        return NextResponse.json({
            success: true,
            queued: true,
            queueItemId: enqueue.queueItemId,
            status: queueItem?.status || 'pending',
            providerMessageId: queueItem?.providerMessageId || null,
            internalMessageId: enqueue.internalMessageId,
            worker,
        });
    } catch (error) {
        console.error('[API] send-contrato erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao enfileirar contrato' }, { status: 500 });
    }
}

