export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { buildAvaliacaoPropostaMessage } from '@/lib/whatsapp-sender';
import { enqueueWhatsAppTextJob } from '@/lib/whatsapp/outbox/service';
import { processWhatsAppOutboxOnce } from '@/lib/whatsapp/outbox/worker';
import { guardCapability } from '@/lib/auth/capability-guard';

export async function POST(request: NextRequest) {
    try {
        const guard = await guardCapability('SEND_PROPOSTA');
        if (guard instanceof NextResponse) return guard;

        const { avaliacaoId } = await request.json();

        if (!avaliacaoId) {
            return NextResponse.json(
                { success: false, error: 'avaliacaoId e obrigatorio' },
                { status: 400 }
            );
        }

        const avaliacao = await prisma.avaliacao.findUnique({
            where: { id: avaliacaoId },
            include: { paciente: true },
        });

        if (!avaliacao) {
            return NextResponse.json(
                { success: false, error: 'Avaliacao nao encontrada' },
                { status: 404 }
            );
        }

        const mensagem = buildAvaliacaoPropostaMessage({
            pacienteNome: avaliacao.paciente.nome || 'Cliente',
            avaliacaoId: avaliacao.id,
            valorProposto: avaliacao.valorProposto || undefined,
        });

        await logger.info('whatsapp_reenvio_queue', `Enfileirando proposta para ${avaliacao.paciente.nome}`, {
            avaliacaoId,
            pacienteTelefone: avaliacao.paciente.telefone,
        });

        const enqueue = await enqueueWhatsAppTextJob({
            phone: avaliacao.paciente.telefone,
            text: mensagem,
            context: {
                source: 'admin_reenviar_whatsapp',
                avaliacaoId: avaliacao.id,
                pacienteId: avaliacao.pacienteId,
            },
            metadata: {
                tipo: 'PROPOSTA',
                avaliacaoId: avaliacao.id,
            },
        });

        const worker = await processWhatsAppOutboxOnce({ limit: 10 });
        const queueItem = await prisma.whatsAppQueueItem.findUnique({ where: { id: enqueue.queueItemId } });

        return NextResponse.json({
            success: true,
            queued: true,
            queueItemId: enqueue.queueItemId,
            idempotencyKey: enqueue.idempotencyKey,
            internalMessageId: enqueue.internalMessageId,
            status: queueItem?.status || 'pending',
            providerMessageId: queueItem?.providerMessageId || null,
            error: queueItem?.error || null,
            worker,
        });
    } catch (error) {
        await logger.error('reenvio_whatsapp_error', 'Erro ao reenviar WhatsApp', error instanceof Error ? error : undefined);
        await logger.error('reenvio_erro', 'Erro ao reenviar proposta', error as Error);

        return NextResponse.json(
            { success: false, error: 'Erro interno ao reenviar' },
            { status: 500 }
        );
    }
}
