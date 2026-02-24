export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { enqueueWhatsAppPropostaJob } from '@/lib/whatsapp/outbox/service';
import { processWhatsAppOutboxOnce } from '@/lib/whatsapp/outbox/worker';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { ok, fail, E } from '@/lib/api/response';
import { z } from 'zod';
import { parseBody, isFailResponse } from '@/lib/api/parse-body';

async function handleGet(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await guardCapability('VIEW_ORCAMENTOS');
    if (guard instanceof NextResponse) return guard;

    const { id } = await params;
    const orcamento = await prisma.orcamento.findUnique({
        where: { id },
        include: { paciente: true },
    });

    if (!orcamento) {
        return fail(E.NOT_FOUND, 'Orcamento nao encontrado', { status: 404 });
    }

    return ok({ orcamento });
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

const patchSchema = z.object({
    action: z.string().optional(),
    cenarioSelecionado: z.string().optional(),
    valorFinal: z.union([z.string(), z.number()]).optional(),
    aprovadoPor: z.string().optional(),
}).passthrough();

async function handlePatch(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await guardCapability('MANAGE_ORCAMENTOS');
    if (guard instanceof NextResponse) return guard;

    const { id } = await params;
    const body = await parseBody(request, patchSchema);
    if (isFailResponse(body)) return body;

    const { action, cenarioSelecionado, valorFinal, aprovadoPor } = body;

    if (action === 'enviar') {
        const envio = await enviarProposta(id);
        if (!envio.success) {
            return fail(E.NOT_FOUND, envio.error!, { status: envio.status });
        }

        return ok({
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
        const raw = body as Record<string, unknown>;
        if (raw.cenarioEconomico) updateData.cenarioEconomico = raw.cenarioEconomico;
        if (raw.cenarioRecomendado) updateData.cenarioRecomendado = raw.cenarioRecomendado;
        if (raw.cenarioPremium) updateData.cenarioPremium = raw.cenarioPremium;
        if (cenarioSelecionado) updateData.cenarioSelecionado = cenarioSelecionado;
        if (valorFinal) updateData.valorFinal = parseFloat(String(valorFinal));
    }

    const orcamento = await prisma.orcamento.update({
        where: { id },
        data: updateData,
        include: { paciente: true },
    });

    return ok({ orcamento });
}

export const GET = withErrorBoundary(handleGet);
export const PATCH = withRateLimit(withErrorBoundary(handlePatch), { max: 20, windowSec: 60 });
