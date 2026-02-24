import { randomUUID } from 'node:crypto';
import logger from '@/lib/logger';
import { normalizeOutboundPhoneBR } from '@/lib/phone-validator';
import { prisma } from '@/lib/prisma';
import { triggerOutboxProcessing } from '@/lib/jobs/whatsapp.queue';
import type {
    OutboxIntent,
    OutboxStatus,
    SendContratoPayload,
    SendDocumentPayload,
    SendPropostaPayload,
    SendTemplatePayload,
    SendTextPayload,
    WhatsAppOutboxPayload,
} from './types';
import {
    sendContratoPayloadSchema,
    sendDocumentPayloadSchema,
    sendPropostaPayloadSchema,
    sendTemplatePayloadSchema,
    sendTextPayloadSchema,
    whatsappOutboxPayloadSchema,
} from './types';

export interface EnqueueResult {
    queueItemId: string;
    idempotencyKey: string;
    internalMessageId: string;
    status: OutboxStatus;
    phone: string;
    duplicated: boolean;
}

interface BaseEnqueueInput {
    phone: string;
    scheduledAt?: Date;
    idempotencyKey?: string;
    context?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
}

export interface EnqueueTextInput extends BaseEnqueueInput {
    text: string;
}

export interface EnqueueTemplateInput extends BaseEnqueueInput {
    templateId?: string;
    templateContent?: string;
    variables?: Record<string, string | number | boolean | null>;
}

export interface EnqueueDocumentInput extends BaseEnqueueInput {
    fileName: string;
    mimeType?: string;
    caption?: string;
    documentBase64: string;
}

export interface EnqueuePropostaInput extends BaseEnqueueInput {
    orcamentoId: string;
}

export interface EnqueueContratoInput extends BaseEnqueueInput {
    orcamentoId: string;
}

function buildInternalMessageId(intent: OutboxIntent): string {
    return `${intent.toLowerCase()}_${randomUUID()}`;
}

function buildIdempotencyKey(intent: OutboxIntent, phone: string, custom?: string): string {
    if (custom?.trim()) return custom.trim();
    return `${intent}:${phone}:${randomUUID()}`;
}

function toBasePayload(input: BaseEnqueueInput, intent: OutboxIntent) {
    const normalized = normalizeOutboundPhoneBR(input.phone);
    if (!normalized.isValid) {
        throw new Error(normalized.error || 'Telefone invalido');
    }

    if (normalized.type !== 'celular') {
        throw new Error('WhatsApp requer numero de celular');
    }

    const internalMessageId = buildInternalMessageId(intent);
    const idempotencyKey = buildIdempotencyKey(intent, normalized.e164, input.idempotencyKey);

    return {
        normalized,
        internalMessageId,
        idempotencyKey,
        context: input.context,
        metadata: input.metadata,
    };
}

async function upsertByIdempotency(
    phone: string,
    payload: WhatsAppOutboxPayload,
    scheduledAt: Date | null,
): Promise<EnqueueResult> {
    const existing = await prisma.whatsAppQueueItem.findFirst({
        where: { idempotencyKey: payload.idempotencyKey },
        orderBy: { createdAt: 'desc' },
    });

    if (existing) {
        return {
            queueItemId: existing.id,
            idempotencyKey: existing.idempotencyKey || payload.idempotencyKey,
            internalMessageId: existing.internalMessageId || payload.internalMessageId,
            status: (existing.status as OutboxStatus) || 'pending',
            phone: existing.phone,
            duplicated: true,
        };
    }

    const created = await prisma.whatsAppQueueItem.create({
        data: {
            phone,
            payload: JSON.stringify(payload),
            status: 'pending',
            scheduledAt,
            idempotencyKey: payload.idempotencyKey,
            internalMessageId: payload.internalMessageId,
        },
    });

    await logger.whatsapp('whatsapp_outbox_enqueued', `Outbox job criado: ${payload.intent}`, {
        queueItemId: created.id,
        intent: payload.intent,
        phone,
        idempotencyKey: payload.idempotencyKey,
        internalMessageId: payload.internalMessageId,
        providerMessageId: null,
        resolvedMessageId: payload.internalMessageId,
        scheduledAt: scheduledAt?.toISOString() || null,
        context: payload.context || null,
    });

    // Trigger BullMQ worker to process immediately (falls back to polling if Redis unavailable)
    triggerOutboxProcessing().catch(() => {});

    return {
        queueItemId: created.id,
        idempotencyKey: payload.idempotencyKey,
        internalMessageId: payload.internalMessageId,
        status: 'pending',
        phone,
        duplicated: false,
    };
}

export async function enqueueWhatsAppPayload(
    payload: WhatsAppOutboxPayload,
    phone: string,
    scheduledAt?: Date
): Promise<EnqueueResult> {
    const parsedPayload = whatsappOutboxPayloadSchema.parse(payload);
    const scheduled = scheduledAt ?? null;

    return upsertByIdempotency(phone, parsedPayload, scheduled);
}

export async function enqueueWhatsAppTextJob(input: EnqueueTextInput): Promise<EnqueueResult> {
    const base = toBasePayload(input, 'SEND_TEXT');
    const payload: SendTextPayload = sendTextPayloadSchema.parse({
        channel: 'whatsapp',
        intent: 'SEND_TEXT',
        text: input.text,
        idempotencyKey: base.idempotencyKey,
        internalMessageId: base.internalMessageId,
        createdAt: new Date().toISOString(),
        context: base.context,
        metadata: base.metadata,
    });

    return upsertByIdempotency(base.normalized.e164, payload, input.scheduledAt ?? null);
}

export async function enqueueWhatsAppTemplateJob(input: EnqueueTemplateInput): Promise<EnqueueResult> {
    const base = toBasePayload(input, 'SEND_TEMPLATE');
    const payload: SendTemplatePayload = sendTemplatePayloadSchema.parse({
        channel: 'whatsapp',
        intent: 'SEND_TEMPLATE',
        templateId: input.templateId,
        templateContent: input.templateContent,
        variables: input.variables || {},
        idempotencyKey: base.idempotencyKey,
        internalMessageId: base.internalMessageId,
        createdAt: new Date().toISOString(),
        context: base.context,
        metadata: base.metadata,
    });

    return upsertByIdempotency(base.normalized.e164, payload, input.scheduledAt ?? null);
}

export async function enqueueWhatsAppDocumentJob(input: EnqueueDocumentInput): Promise<EnqueueResult> {
    const base = toBasePayload(input, 'SEND_DOCUMENT');
    const payload: SendDocumentPayload = sendDocumentPayloadSchema.parse({
        channel: 'whatsapp',
        intent: 'SEND_DOCUMENT',
        fileName: input.fileName,
        mimeType: input.mimeType || 'application/pdf',
        caption: input.caption || '',
        documentBase64: input.documentBase64,
        idempotencyKey: base.idempotencyKey,
        internalMessageId: base.internalMessageId,
        createdAt: new Date().toISOString(),
        context: base.context,
        metadata: base.metadata,
    });

    return upsertByIdempotency(base.normalized.e164, payload, input.scheduledAt ?? null);
}

export async function enqueueWhatsAppPropostaJob(input: EnqueuePropostaInput): Promise<EnqueueResult> {
    const base = toBasePayload(input, 'SEND_PROPOSTA');
    const payload: SendPropostaPayload = sendPropostaPayloadSchema.parse({
        channel: 'whatsapp',
        intent: 'SEND_PROPOSTA',
        orcamentoId: input.orcamentoId,
        idempotencyKey: base.idempotencyKey,
        internalMessageId: base.internalMessageId,
        createdAt: new Date().toISOString(),
        context: base.context,
        metadata: base.metadata,
    });

    return upsertByIdempotency(base.normalized.e164, payload, input.scheduledAt ?? null);
}

export async function enqueueWhatsAppContratoJob(input: EnqueueContratoInput): Promise<EnqueueResult> {
    const base = toBasePayload(input, 'SEND_CONTRATO');
    const payload: SendContratoPayload = sendContratoPayloadSchema.parse({
        channel: 'whatsapp',
        intent: 'SEND_CONTRATO',
        orcamentoId: input.orcamentoId,
        idempotencyKey: base.idempotencyKey,
        internalMessageId: base.internalMessageId,
        createdAt: new Date().toISOString(),
        context: base.context,
        metadata: base.metadata,
    });

    return upsertByIdempotency(base.normalized.e164, payload, input.scheduledAt ?? null);
}
