import { z } from 'zod';

export const OUTBOX_STATUSES = ['pending', 'sending', 'sent', 'retrying', 'dead', 'canceled'] as const;
export type OutboxStatus = (typeof OUTBOX_STATUSES)[number];

export const OUTBOX_INTENTS = [
    'SEND_TEXT',
    'SEND_TEMPLATE',
    'SEND_DOCUMENT',
    'SEND_PROPOSTA',
    'SEND_CONTRATO',
] as const;
export type OutboxIntent = (typeof OUTBOX_INTENTS)[number];

const metadataSchema = z.record(z.string(), z.unknown()).optional();

export const outboxContextSchema = z.object({
    source: z.string().optional(),
    pacienteId: z.string().optional(),
    avaliacaoId: z.string().optional(),
    orcamentoId: z.string().optional(),
    userId: z.string().optional(),
}).passthrough();

const basePayloadSchema = z.object({
    channel: z.literal('whatsapp'),
    intent: z.enum(OUTBOX_INTENTS),
    idempotencyKey: z.string().min(8),
    internalMessageId: z.string().min(8),
    createdAt: z.string(),
    context: outboxContextSchema.optional(),
    metadata: metadataSchema,
});

export const sendTextPayloadSchema = basePayloadSchema.extend({
    intent: z.literal('SEND_TEXT'),
    text: z.string().min(1),
});

export const sendTemplatePayloadSchema = basePayloadSchema.extend({
    intent: z.literal('SEND_TEMPLATE'),
    templateId: z.string().optional(),
    templateContent: z.string().optional(),
    variables: z.record(
        z.string(),
        z.union([z.string(), z.number(), z.boolean(), z.null()])
    ).default({}),
}).refine((value) => Boolean(value.templateId || value.templateContent), {
    message: 'templateId ou templateContent e obrigatorio',
});

export const sendDocumentPayloadSchema = basePayloadSchema.extend({
    intent: z.literal('SEND_DOCUMENT'),
    fileName: z.string().min(1),
    mimeType: z.string().default('application/pdf'),
    caption: z.string().default(''),
    documentBase64: z.string().min(1),
});

export const sendPropostaPayloadSchema = basePayloadSchema.extend({
    intent: z.literal('SEND_PROPOSTA'),
    orcamentoId: z.string().min(1),
});

export const sendContratoPayloadSchema = basePayloadSchema.extend({
    intent: z.literal('SEND_CONTRATO'),
    orcamentoId: z.string().min(1),
});

export const whatsappOutboxPayloadSchema = z.discriminatedUnion('intent', [
    sendTextPayloadSchema,
    sendTemplatePayloadSchema,
    sendDocumentPayloadSchema,
    sendPropostaPayloadSchema,
    sendContratoPayloadSchema,
]);

export type WhatsAppOutboxPayload = z.infer<typeof whatsappOutboxPayloadSchema>;
export type SendTextPayload = z.infer<typeof sendTextPayloadSchema>;
export type SendTemplatePayload = z.infer<typeof sendTemplatePayloadSchema>;
export type SendDocumentPayload = z.infer<typeof sendDocumentPayloadSchema>;
export type SendPropostaPayload = z.infer<typeof sendPropostaPayloadSchema>;
export type SendContratoPayload = z.infer<typeof sendContratoPayloadSchema>;
