export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { enqueueWhatsAppContratoJob } from '@/lib/whatsapp/outbox/service';
import { processWhatsAppOutboxOnce } from '@/lib/whatsapp/outbox/worker';
import { guardCapability } from '@/lib/auth/capability-guard';
import { E, fail, ok } from '@/lib/api/response';
import { parseOrcamentoSendOptions } from '@/lib/documents/send-options';
import { getDbSchemaCapabilities } from '@/lib/db/schema-capabilities';

function isMissingColumnError(error: unknown): boolean {
    return Boolean(error && typeof error === 'object' && (error as { code?: string }).code === 'P2022');
}

function resolveMissingColumn(error: unknown): { table: string; column: string } {
    const message = String((error as Error | undefined)?.message || '');
    const match = message.match(/column [`"]?(?:\w+\.)?([A-Za-z0-9_]+)\.([A-Za-z0-9_]+)[`"]?/i);
    if (!match) {
        return { table: 'Orcamento', column: 'auditHash' };
    }
    return {
        table: match[1] || 'Orcamento',
        column: match[2] || 'auditHash',
    };
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const guard = await guardCapability('SEND_CONTRATO');
        if (guard instanceof NextResponse) {
            return guard;
        }

        const { id: avaliacaoId } = await params;
        const body = await request.json().catch(() => ({}));
        let sendOptions;
        try {
            sendOptions = parseOrcamentoSendOptions(body);
        } catch (error) {
            return fail(E.VALIDATION_ERROR, error instanceof Error ? error.message : 'Opcoes de envio invalidas', {
                status: 400,
            });
        }

        const avaliacao = await prisma.avaliacao.findUnique({
            where: { id: avaliacaoId },
            include: { paciente: true },
        });

        if (!avaliacao) {
            return fail(E.NOT_FOUND, 'Avaliacao nao encontrada', { status: 404 });
        }

        const schemaCapabilities = await getDbSchemaCapabilities();
        if (!schemaCapabilities.dbSchemaOk) {
            await logger.warning('db_schema_drift', 'Schema desatualizado ao consultar Orcamento para envio de contrato', {
                table: 'Orcamento',
                column: 'auditHash',
                missingColumns: schemaCapabilities.missingColumns,
            });
            return fail(E.DATABASE_ERROR, 'Schema do banco desatualizado para Orcamento. Aplique as migrations pendentes.', {
                status: 503,
                details: {
                    action: 'db_schema_drift',
                    table: 'Orcamento',
                    column: 'auditHash',
                    missingColumns: schemaCapabilities.missingColumns,
                },
            });
        }

        let orcamento;
        try {
            orcamento = body?.orcamentoId
                ? await prisma.orcamento.findUnique({ where: { id: String(body.orcamentoId) } })
                : await prisma.orcamento.findFirst({
                    where: { pacienteId: avaliacao.pacienteId },
                    orderBy: { createdAt: 'desc' },
                });
        } catch (queryError) {
            if (!isMissingColumnError(queryError)) throw queryError;
            const resolved = resolveMissingColumn(queryError);
            await logger.warning('db_schema_drift', 'P2022 ao consultar Orcamento para envio de contrato', {
                table: resolved.table,
                column: resolved.column,
                avaliacaoId,
            });
            return fail(E.DATABASE_ERROR, 'Schema do banco desatualizado para Orcamento. Aplique as migrations pendentes.', {
                status: 503,
                details: {
                    action: 'db_schema_drift',
                    table: resolved.table,
                    column: resolved.column,
                },
            });
        }

        if (!orcamento) {
            return fail(E.NOT_FOUND, 'Orcamento nao encontrado para esta avaliacao', { status: 404 });
        }

        const enqueue = await enqueueWhatsAppContratoJob({
            phone: avaliacao.paciente.telefone,
            orcamentoId: orcamento.id,
            context: {
                source: 'admin_send_contrato',
                avaliacaoId,
                pacienteId: avaliacao.pacienteId,
                orcamentoId: orcamento.id,
                sendOptions,
            },
            metadata: {
                tipo: 'CONTRATO',
                avaliacaoId,
                orcamentoId: orcamento.id,
                sendOptions,
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

        return ok({
            queued: true,
            queueItemId: enqueue.queueItemId,
            status: queueItem?.status || 'pending',
            providerMessageId: queueItem?.providerMessageId || null,
            internalMessageId: enqueue.internalMessageId,
            worker,
        });
    } catch (error) {
        console.error('[API] send-contrato erro:', error);
        const message = error instanceof Error ? error.message : 'Erro ao enfileirar contrato';
        return fail(E.DATABASE_ERROR, message, { status: 500 });
    }
}
