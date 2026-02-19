export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { enqueueWhatsAppPropostaJob } from '@/lib/whatsapp/outbox/service';
import { processWhatsAppOutboxOnce } from '@/lib/whatsapp/outbox/worker';

export async function GET(
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

        return NextResponse.json({ success: true, orcamento });
    } catch (error) {
        console.error('Error fetching orcamento:', error);
        return NextResponse.json({ success: false, error: 'Erro ao buscar orcamento' }, { status: 500 });
    }
}

async function enviarProposta(orcamentoId: string) {
    const orcamento = await prisma.orcamento.findUnique({
        where: { id: orcamentoId },
        include: { paciente: true },
    });

    if (!orcamento) {
        return { success: false, status: 404, error: 'Orcamento nao encontrado' };
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
            source: 'admin_orcamento_patch_enviar',
            orcamentoId: orcamento.id,
            pacienteId: orcamento.pacienteId,
            avaliacaoId: avaliacao?.id,
        },
        metadata: {
            tipo: 'PROPOSTA',
            orcamentoId: orcamento.id,
        },
    });

    const worker = await processWhatsAppOutboxOnce({ limit: 10 });
    const queueItem = await prisma.whatsAppQueueItem.findUnique({ where: { id: enqueue.queueItemId } });

    await logger.whatsapp('orcamento_proposta_enfileirada_patch', `Proposta enfileirada para ${orcamento.paciente?.telefone}`, {
        orcamentoId: orcamento.id,
        queueItemId: enqueue.queueItemId,
        status: queueItem?.status || 'pending',
        internalMessageId: enqueue.internalMessageId,
        providerMessageId: queueItem?.providerMessageId || null,
    });

    return {
        success: true,
        status: 202,
        orcamento,
        queueItemId: enqueue.queueItemId,
        internalMessageId: enqueue.internalMessageId,
        queueStatus: queueItem?.status || 'pending',
        providerMessageId: queueItem?.providerMessageId || null,
        worker,
    };
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { action, cenarioSelecionado, valorFinal, aprovadoPor } = body;

        if (action === 'enviar') {
            const envio = await enviarProposta(id);
            if (!envio.success) {
                return NextResponse.json(
                    {
                        success: false,
                        error: envio.error,
                    },
                    { status: envio.status }
                );
            }

            return NextResponse.json({
                success: true,
                orcamento: envio.orcamento,
                queueItemId: envio.queueItemId,
                internalMessageId: envio.internalMessageId,
                queueStatus: envio.queueStatus,
                providerMessageId: envio.providerMessageId,
                worker: envio.worker,
            });
        }

        let updateData: any = {};
        if (action === 'aceitar') {
            updateData = { status: 'ACEITO', aceitoEm: new Date() };
        } else if (action === 'aprovar') {
            updateData = {
                cenarioSelecionado,
                valorFinal: valorFinal ? parseFloat(String(valorFinal)) : undefined,
                aprovadoPor,
                status: 'APROVADO',
            };
        } else if (action === 'cancelar') {
            updateData = { status: 'CANCELADO' };
        } else {
            updateData = {
                ...(body.cenarioEconomico && { cenarioEconomico: body.cenarioEconomico }),
                ...(body.cenarioRecomendado && { cenarioRecomendado: body.cenarioRecomendado }),
                ...(body.cenarioPremium && { cenarioPremium: body.cenarioPremium }),
                ...(cenarioSelecionado && { cenarioSelecionado }),
                ...(valorFinal && { valorFinal: parseFloat(String(valorFinal)) }),
            };
        }

        const orcamento = await prisma.orcamento.update({
            where: { id },
            data: updateData,
            include: { paciente: true },
        });

        return NextResponse.json({ success: true, orcamento });
    } catch (error) {
        console.error('Error updating orcamento:', error);
        return NextResponse.json({ success: false, error: 'Erro ao atualizar orcamento' }, { status: 500 });
    }
}
