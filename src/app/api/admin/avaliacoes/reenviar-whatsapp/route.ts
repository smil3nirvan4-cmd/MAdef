export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { buildAvaliacaoPropostaMessage } from '@/lib/whatsapp-sender';
import { enqueueWhatsAppTextJob } from '@/lib/whatsapp/outbox/service';
import { processWhatsAppOutboxOnce } from '@/lib/whatsapp/outbox/worker';
import { guardCapability } from '@/lib/auth/capability-guard';
import { parseBody } from '@/lib/api/parse-body';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';

const reenviarWhatsappSchema = z.object({
    avaliacaoId: z.string().min(1),
});

async function handlePost(request: NextRequest) {
    const guard = await guardCapability('SEND_PROPOSTA');
    if (guard instanceof NextResponse) return guard;

    const { data, error } = await parseBody(request, reenviarWhatsappSchema);
    if (error) return error;
    const { avaliacaoId } = data;

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
}

export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 10, windowMs: 60_000 });
