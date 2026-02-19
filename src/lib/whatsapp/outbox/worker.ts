import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import logger from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { buildOrcamentoPDFData } from '@/lib/documents/build-pdf-data';
import { renderCommercialMessage } from '@/lib/documents/commercial-message';
import { parseOrcamentoSendOptionsSafe } from '@/lib/documents/send-options';
import { sendDocumentViaBridge } from '@/lib/documents/whatsapp-documents';
import { generateContratoPDF, generatePropostaPDF } from '@/lib/documents/pdf-generator';
import whatsappSender from '@/lib/whatsapp-sender';
import { calculateNextScheduledAt, shouldDie } from './backoff';
import { renderTemplateContent } from './template-renderer';
import { whatsappOutboxPayloadSchema, type WhatsAppOutboxPayload } from './types';

const WORKER_LOCK_RESOURCE = 'whatsapp-outbox-worker';
const WORKER_LOCK_TTL_MS = 30_000;

export interface ProcessOutboxOptions {
    limit?: number;
    maxRetries?: number;
}

export interface ProcessOutboxResult {
    picked: number;
    sent: number;
    retrying: number;
    dead: number;
    canceled: number;
    skippedByLock: boolean;
}

function isNonRetryableError(message: string): boolean {
    const normalized = message.toLowerCase();
    return (
        normalized.includes('telefone invalido')
        || normalized.includes('numero de celular')
        || normalized.includes('payload invalido')
        || normalized.includes('template nao encontrado')
        || normalized.includes('variaveis ausentes')
        || normalized.includes('orcamento nao encontrado')
    );
}

async function acquireWorkerLock(ownerId: string): Promise<boolean> {
    const now = new Date();
    const expiresAt = new Date(Date.now() + WORKER_LOCK_TTL_MS);

    return prisma.$transaction(async (tx) => {
        const existing = await tx.whatsAppLock.findUnique({
            where: { resourceId: WORKER_LOCK_RESOURCE },
        });

        if (existing && existing.ownerId !== ownerId && existing.expiresAt > now) {
            return false;
        }

        await tx.whatsAppLock.upsert({
            where: { resourceId: WORKER_LOCK_RESOURCE },
            create: {
                resourceId: WORKER_LOCK_RESOURCE,
                ownerId,
                expiresAt,
            },
            update: {
                ownerId,
                expiresAt,
            },
        });

        return true;
    });
}

async function releaseWorkerLock(ownerId: string): Promise<void> {
    await prisma.whatsAppLock.deleteMany({
        where: {
            resourceId: WORKER_LOCK_RESOURCE,
            ownerId,
        },
    });
}

async function markAvaliacaoFailure(avaliacaoId: string, error: string, resolvedMessageId: string): Promise<void> {
    await prisma.avaliacao.update({
        where: { id: avaliacaoId },
        data: {
            whatsappEnviado: false,
            whatsappEnviadoEm: null,
            whatsappMessageId: resolvedMessageId,
            whatsappErro: error,
            whatsappTentativas: { increment: 1 },
        },
    });
}

async function markAvaliacaoSuccess(avaliacaoId: string, messageId: string): Promise<void> {
    await prisma.avaliacao.update({
        where: { id: avaliacaoId },
        data: {
            whatsappEnviado: true,
            whatsappEnviadoEm: new Date(),
            whatsappMessageId: messageId,
            whatsappErro: null,
            whatsappTentativas: { increment: 1 },
        },
    });
}

async function markScheduledSuccess(scheduledId: string): Promise<void> {
    await prisma.whatsAppScheduled.updateMany({
        where: { id: scheduledId },
        data: {
            status: 'sent',
            sentAt: new Date(),
        },
    });
}

async function markScheduledFailure(scheduledId: string): Promise<void> {
    await prisma.whatsAppScheduled.updateMany({
        where: { id: scheduledId },
        data: {
            status: 'failed',
        },
    });
}

async function executeOutboxPayload(
    payload: WhatsAppOutboxPayload,
    phone: string
): Promise<{ success: boolean; messageId?: string; error?: string; errorCode?: string }> {
    if (payload.intent === 'SEND_TEXT') {
        const result = await whatsappSender.sendText(phone, payload.text);
        return {
            success: result.success,
            messageId: result.messageId,
            error: result.error,
            errorCode: result.errorCode,
        };
    }

    if (payload.intent === 'SEND_TEMPLATE') {
        let templateContent = payload.templateContent || '';

        if (!templateContent && payload.templateId) {
            const template = await prisma.whatsAppTemplate.findUnique({
                where: { id: payload.templateId },
            });

            if (!template || !template.isActive) {
                return { success: false, error: 'Template nao encontrado ou inativo' };
            }

            templateContent = template.content;
        }

        const rendered = renderTemplateContent(templateContent, payload.variables || {});
        if (rendered.missingVariables.length > 0) {
            return {
                success: false,
                error: `Variaveis ausentes: ${rendered.missingVariables.join(', ')}`,
            };
        }

        const result = await whatsappSender.sendText(phone, rendered.rendered);
        return {
            success: result.success,
            messageId: result.messageId,
            error: result.error,
            errorCode: result.errorCode,
        };
    }

    if (payload.intent === 'SEND_DOCUMENT') {
        const buffer = Buffer.from(payload.documentBase64, 'base64');
        const result = await sendDocumentViaBridge({
            phone,
            fileName: payload.fileName,
            caption: payload.caption,
            buffer,
        });
        return {
            success: result.success,
            messageId: result.messageId || undefined,
            error: result.error,
            errorCode: result.errorCode,
        };
    }

    if (payload.intent === 'SEND_PROPOSTA' || payload.intent === 'SEND_CONTRATO') {
        const orcamento = await prisma.orcamento.findUnique({
            where: { id: payload.orcamentoId },
            include: { paciente: true },
        });

        if (!orcamento) {
            return { success: false, error: 'Orcamento nao encontrado' };
        }

        const avaliacao = await prisma.avaliacao.findFirst({
            where: { pacienteId: orcamento.pacienteId },
            include: { paciente: true },
            orderBy: { createdAt: 'desc' },
        });

        const tipo = payload.intent === 'SEND_PROPOSTA' ? 'PROPOSTA' : 'CONTRATO';
        const contextData = (payload.context ?? {}) as Record<string, unknown>;
        const metadataData = (payload.metadata ?? {}) as Record<string, unknown>;
        const sendOptions = parseOrcamentoSendOptionsSafe(contextData.sendOptions ?? metadataData.sendOptions);
        const pdfData = buildOrcamentoPDFData(
            avaliacao as unknown as Record<string, unknown> | null,
            orcamento as unknown as Record<string, unknown>,
            tipo,
            sendOptions,
        );
        const mensagem = renderCommercialMessage({
            tipo,
            pacienteNome: String(orcamento.paciente?.nome || avaliacao?.paciente?.nome || 'Paciente'),
            pdfData,
            avaliacao: avaliacao as unknown as Record<string, unknown> | null,
            orcamento: orcamento as unknown as Record<string, unknown>,
            sendOptions,
        });
        if (mensagem.missingVariables.length > 0) {
            return {
                success: false,
                error: `Variaveis ausentes: ${mensagem.missingVariables.join(', ')}`,
            };
        }

        const pdfBuffer = tipo === 'PROPOSTA'
            ? await generatePropostaPDF(pdfData)
            : await generateContratoPDF(pdfData);

        const safeReference = pdfData.referencia.replace(/[^A-Za-z0-9_-]/g, '_');
        const envio = await sendDocumentViaBridge({
            phone,
            fileName: `${tipo === 'PROPOSTA' ? 'Proposta' : 'Contrato'}_${safeReference}_MaosAmigas.pdf`,
            caption: mensagem.rendered,
            buffer: pdfBuffer,
        });

        if (envio.success) {
            const updateData: Prisma.OrcamentoUpdateInput = {
                status: tipo === 'PROPOSTA' ? 'PROPOSTA_ENVIADA' : 'CONTRATO_ENVIADO',
                enviadoEm: new Date(),
                valorFinal: pdfData.cenario.totalSemanal,
            };

            if (sendOptions?.cenarioSelecionado) {
                updateData.cenarioSelecionado = sendOptions.cenarioSelecionado;
            }
            if (sendOptions?.descontoManualPercent !== undefined) {
                updateData.descontoManualPercent = sendOptions.descontoManualPercent;
            }
            if (sendOptions?.minicustosDesativados !== undefined) {
                updateData.minicustosDesativados = sendOptions.minicustosDesativados.length
                    ? JSON.stringify(sendOptions.minicustosDesativados)
                    : null;
            }

            await prisma.orcamento.update({
                where: { id: orcamento.id },
                data: updateData,
            });
        }

        return {
            success: envio.success,
            messageId: envio.messageId || undefined,
            error: envio.error,
            errorCode: envio.errorCode,
        };
    }

    return { success: false, error: 'Intent nao suportado' };
}

async function processQueueItem(
    queueItemId: string,
    counters: ProcessOutboxResult,
): Promise<void> {
    const queueItem = await prisma.whatsAppQueueItem.findUnique({
        where: { id: queueItemId },
    });
    if (!queueItem) return;

    let payload: WhatsAppOutboxPayload;
    try {
        payload = whatsappOutboxPayloadSchema.parse(JSON.parse(queueItem.payload));
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Payload invalido';
        const internalMessageId = queueItem.internalMessageId || `queue_${queueItem.id}`;
        const idempotencyKey = queueItem.idempotencyKey || null;

        await prisma.whatsAppQueueItem.update({
            where: { id: queueItem.id },
            data: {
                status: 'dead',
                error: `Payload invalido: ${message}`,
                retries: queueItem.retries + 1,
            },
        });

        await logger.warning('whatsapp_outbox_failed', 'Outbox falhou: payload invalido', {
            queueItemId: queueItem.id,
            intent: 'INVALID_PAYLOAD',
            phone: queueItem.phone,
            error: message,
            retries: queueItem.retries + 1,
            status: 'dead',
            idempotencyKey,
            internalMessageId,
            providerMessageId: queueItem.providerMessageId || null,
            resolvedMessageId: queueItem.providerMessageId || internalMessageId,
            context: null,
        });

        counters.dead += 1;
        return;
    }

    const internalMessageId = queueItem.internalMessageId || payload.internalMessageId || `queue_${queueItem.id}`;
    const idempotencyKey = queueItem.idempotencyKey || payload.idempotencyKey || null;

    await logger.whatsapp('whatsapp_outbox_attempt', `Tentativa de envio: ${payload.intent}`, {
        queueItemId: queueItem.id,
        intent: payload.intent,
        phone: queueItem.phone,
        retries: queueItem.retries,
        idempotencyKey,
        internalMessageId,
        providerMessageId: queueItem.providerMessageId || null,
        resolvedMessageId: queueItem.providerMessageId || internalMessageId,
        context: payload.context || null,
    });

    const delivery = await executeOutboxPayload(payload, queueItem.phone);
    const resolvedMessageId = delivery.messageId || internalMessageId;

    if (delivery.success) {
        await prisma.whatsAppQueueItem.update({
            where: { id: queueItem.id },
            data: {
                status: 'sent',
                sentAt: new Date(),
                error: null,
                providerMessageId: delivery.messageId || null,
            },
        });

        if (payload.context?.avaliacaoId) {
            await markAvaliacaoSuccess(payload.context.avaliacaoId, resolvedMessageId);
        }
        if (payload.context?.scheduledId) {
            await markScheduledSuccess(String(payload.context.scheduledId));
        }

        await logger.whatsapp('whatsapp_outbox_sent', `Outbox enviado: ${payload.intent}`, {
            queueItemId: queueItem.id,
            intent: payload.intent,
            phone: queueItem.phone,
            idempotencyKey,
            providerMessageId: delivery.messageId || null,
            internalMessageId,
            resolvedMessageId,
            context: payload.context || null,
        });

        counters.sent += 1;
        return;
    }

    const nextRetries = queueItem.retries + 1;
    const errorMessage = delivery.error || 'Falha no envio';
    const isCircuitSuspended = delivery.errorCode === 'CIRCUIT_OPEN';
    if (isCircuitSuspended) {
        const scheduledAt = new Date(Date.now() + 65_000);
        await prisma.whatsAppQueueItem.update({
            where: { id: queueItem.id },
            data: {
                status: 'retrying',
                error: errorMessage,
                scheduledAt,
            },
        });

        counters.retrying += 1;

        await logger.warning('whatsapp_outbox_circuit_suspended', `Circuit breaker aberto: ${payload.intent}`, {
            queueItemId: queueItem.id,
            intent: payload.intent,
            phone: queueItem.phone,
            idempotencyKey,
            internalMessageId,
            providerMessageId: delivery.messageId || null,
            resolvedMessageId,
            retries: queueItem.retries,
            scheduledAt: scheduledAt.toISOString(),
            status: 'retrying',
            errorCode: delivery.errorCode,
            context: payload.context || null,
        });
        return;
    }

    const deadByRetries = shouldDie(nextRetries);
    const shouldMarkDead = deadByRetries || isNonRetryableError(errorMessage);

    if (shouldMarkDead) {
        await prisma.whatsAppQueueItem.update({
            where: { id: queueItem.id },
            data: {
                status: 'dead',
                retries: nextRetries,
                error: errorMessage,
                scheduledAt: null,
            },
        });
        counters.dead += 1;
    } else {
        await prisma.whatsAppQueueItem.update({
            where: { id: queueItem.id },
            data: {
                status: 'retrying',
                retries: nextRetries,
                error: errorMessage,
                scheduledAt: calculateNextScheduledAt(nextRetries),
            },
        });
        counters.retrying += 1;
    }

    if (payload.context?.avaliacaoId) {
        await markAvaliacaoFailure(payload.context.avaliacaoId, errorMessage, resolvedMessageId);
    }
    if (payload.context?.scheduledId && shouldMarkDead) {
        await markScheduledFailure(String(payload.context.scheduledId));
    }

    if (shouldMarkDead) {
        await logger.warning('whatsapp_outbox_dead', `Outbox morto: ${payload.intent}`, {
            queueItemId: queueItem.id,
            intent: payload.intent,
            phone: queueItem.phone,
            error: errorMessage,
            retries: nextRetries,
            status: 'dead',
            idempotencyKey,
            internalMessageId,
            providerMessageId: delivery.messageId || null,
            resolvedMessageId,
            context: payload.context || null,
        });
    } else {
        await logger.warning('whatsapp_outbox_failed', `Outbox falhou: ${payload.intent}`, {
            queueItemId: queueItem.id,
            intent: payload.intent,
            phone: queueItem.phone,
            error: errorMessage,
            retries: nextRetries,
            status: 'retrying',
            idempotencyKey,
            internalMessageId,
            providerMessageId: delivery.messageId || null,
            resolvedMessageId,
            context: payload.context || null,
        });
    }
}

export async function processWhatsAppOutboxOnce(options: ProcessOutboxOptions = {}): Promise<ProcessOutboxResult> {
    const limit = options.limit ?? 20;
    const ownerId = `worker_${randomUUID()}`;
    const now = new Date();

    const result: ProcessOutboxResult = {
        picked: 0,
        sent: 0,
        retrying: 0,
        dead: 0,
        canceled: 0,
        skippedByLock: false,
    };

    const locked = await acquireWorkerLock(ownerId);
    if (!locked) {
        result.skippedByLock = true;
        return result;
    }

    try {
        const dueItems = await prisma.whatsAppQueueItem.findMany({
            where: {
                status: { in: ['pending', 'retrying'] },
                OR: [
                    { scheduledAt: null },
                    { scheduledAt: { lte: now } },
                ],
            },
            orderBy: [
                { scheduledAt: 'asc' },
                { createdAt: 'asc' },
            ],
            take: limit,
        });

        for (const item of dueItems) {
            const claim = await prisma.whatsAppQueueItem.updateMany({
                where: {
                    id: item.id,
                    status: { in: ['pending', 'retrying'] },
                },
                data: {
                    status: 'sending',
                    lastAttemptAt: new Date(),
                },
            });

            if (!claim.count) continue;

            result.picked += 1;
            try {
                await processQueueItem(item.id, result);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Erro inesperado no worker';
                await prisma.whatsAppQueueItem.updateMany({
                    where: { id: item.id },
                    data: {
                        status: 'dead',
                        error: message,
                    },
                });
                result.dead += 1;

                await logger.error('whatsapp_outbox_worker_error', 'Falha inesperada ao processar item da fila', error as Error, {
                    queueItemId: item.id,
                    idempotencyKey: item.idempotencyKey || null,
                    internalMessageId: item.internalMessageId || `queue_${item.id}`,
                    providerMessageId: item.providerMessageId || null,
                    resolvedMessageId: item.providerMessageId || item.internalMessageId || `queue_${item.id}`,
                });
            }
        }

        return result;
    } finally {
        await releaseWorkerLock(ownerId);
    }
}
