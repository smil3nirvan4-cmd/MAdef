import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { enqueueWhatsAppContratoJob } from '@/lib/whatsapp/outbox/service';
import { processWhatsAppOutboxOnce } from '@/lib/whatsapp/outbox/worker';

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
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

        const enqueue = await enqueueWhatsAppContratoJob({
            phone: orcamento.paciente?.telefone || '',
            orcamentoId: orcamento.id,
            context: {
                source: 'admin_orcamento_enviar_contrato',
                orcamentoId: orcamento.id,
                pacienteId: orcamento.pacienteId,
                avaliacaoId: avaliacao?.id,
            },
            metadata: {
                tipo: 'CONTRATO',
                orcamentoId: orcamento.id,
            },
        });

        const worker = await processWhatsAppOutboxOnce({ limit: 10 });
        const queueItem = await prisma.whatsAppQueueItem.findUnique({ where: { id: enqueue.queueItemId } });

        await logger.whatsapp('orcamento_contrato_enfileirado', `Contrato enfileirado para ${orcamento.paciente?.telefone}`, {
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
        console.error('[API] enviar-contrato erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao enfileirar contrato' }, { status: 500 });
    }
}
