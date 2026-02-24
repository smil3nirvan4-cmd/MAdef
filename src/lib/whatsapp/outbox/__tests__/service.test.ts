import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
const mockFindFirst = vi.fn();
const mockCreate = vi.fn();
vi.mock('@/lib/prisma', () => ({
    prisma: {
        whatsAppQueueItem: {
            findFirst: (...args: unknown[]) => mockFindFirst(...args),
            create: (...args: unknown[]) => mockCreate(...args),
        },
    },
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
    default: {
        whatsapp: vi.fn().mockResolvedValue(undefined),
    },
}));

// Mock randomUUID to produce deterministic values
let uuidCounter = 0;
vi.mock('node:crypto', () => ({
    randomUUID: () => {
        uuidCounter++;
        return `00000000-0000-0000-0000-${String(uuidCounter).padStart(12, '0')}`;
    },
}));

import {
    enqueueWhatsAppPayload,
    enqueueWhatsAppTextJob,
    enqueueWhatsAppTemplateJob,
    enqueueWhatsAppDocumentJob,
    enqueueWhatsAppPropostaJob,
    enqueueWhatsAppContratoJob,
} from '../service';
import type { EnqueueResult } from '../service';

// Valid Brazilian mobile phone for testing
const VALID_PHONE = '5511999998888';
const VALID_PHONE_RAW = '11999998888';

beforeEach(() => {
    vi.clearAllMocks();
    uuidCounter = 0;
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
            id: 'queue-item-1',
            phone: data.phone,
            payload: data.payload,
            status: data.status,
            scheduledAt: data.scheduledAt,
            idempotencyKey: data.idempotencyKey,
            internalMessageId: data.internalMessageId,
            createdAt: new Date(),
            updatedAt: new Date(),
        }),
    );
});

// ----- enqueueWhatsAppTextJob -----
describe('enqueueWhatsAppTextJob', () => {
    it('enqueues a text message with valid phone', async () => {
        const result: EnqueueResult = await enqueueWhatsAppTextJob({
            phone: VALID_PHONE_RAW,
            text: 'Hello world',
        });

        expect(result.duplicated).toBe(false);
        expect(result.status).toBe('pending');
        expect(result.phone).toBe(VALID_PHONE);
        expect(result.queueItemId).toBe('queue-item-1');
        expect(result.internalMessageId).toContain('send_text_');
        expect(result.idempotencyKey).toContain('SEND_TEXT:');

        expect(mockCreate).toHaveBeenCalledOnce();
        const createCall = mockCreate.mock.calls[0][0];
        expect(createCall.data.status).toBe('pending');
        const storedPayload = JSON.parse(createCall.data.payload);
        expect(storedPayload.intent).toBe('SEND_TEXT');
        expect(storedPayload.text).toBe('Hello world');
        expect(storedPayload.channel).toBe('whatsapp');
    });

    it('returns duplicated=true when idempotency key already exists', async () => {
        mockFindFirst.mockResolvedValue({
            id: 'existing-id',
            idempotencyKey: 'custom-key-12345678',
            internalMessageId: 'send_text_existing',
            status: 'sent',
            phone: VALID_PHONE,
        });

        const result = await enqueueWhatsAppTextJob({
            phone: VALID_PHONE_RAW,
            text: 'Hello world',
            idempotencyKey: 'custom-key-12345678',
        });

        expect(result.duplicated).toBe(true);
        expect(result.queueItemId).toBe('existing-id');
        expect(result.status).toBe('sent');
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it('uses custom idempotency key when provided', async () => {
        const result = await enqueueWhatsAppTextJob({
            phone: VALID_PHONE_RAW,
            text: 'Hello',
            idempotencyKey: 'my-custom-key-123',
        });

        expect(result.idempotencyKey).toBe('my-custom-key-123');
    });

    it('throws for invalid phone number', async () => {
        await expect(
            enqueueWhatsAppTextJob({ phone: '123', text: 'hi' }),
        ).rejects.toThrow();
    });

    it('throws for landline phone number', async () => {
        // Landline: starts with 2-5, 8 digits after DDD
        await expect(
            enqueueWhatsAppTextJob({ phone: '1133334444', text: 'hi' }),
        ).rejects.toThrow('WhatsApp requer numero de celular');
    });

    it('passes scheduledAt when provided', async () => {
        const scheduled = new Date('2026-03-01T10:00:00Z');

        await enqueueWhatsAppTextJob({
            phone: VALID_PHONE_RAW,
            text: 'scheduled msg',
            scheduledAt: scheduled,
        });

        const createCall = mockCreate.mock.calls[0][0];
        expect(createCall.data.scheduledAt).toEqual(scheduled);
    });

    it('passes null scheduledAt when not provided', async () => {
        await enqueueWhatsAppTextJob({
            phone: VALID_PHONE_RAW,
            text: 'immediate msg',
        });

        const createCall = mockCreate.mock.calls[0][0];
        expect(createCall.data.scheduledAt).toBeNull();
    });

    it('includes context and metadata in payload', async () => {
        await enqueueWhatsAppTextJob({
            phone: VALID_PHONE_RAW,
            text: 'with context',
            context: { source: 'test', pacienteId: 'p1' },
            metadata: { extra: 'data' },
        });

        const createCall = mockCreate.mock.calls[0][0];
        const storedPayload = JSON.parse(createCall.data.payload);
        expect(storedPayload.context).toEqual({ source: 'test', pacienteId: 'p1' });
        expect(storedPayload.metadata).toEqual({ extra: 'data' });
    });
});

// ----- enqueueWhatsAppTemplateJob -----
describe('enqueueWhatsAppTemplateJob', () => {
    it('enqueues a template message with templateId', async () => {
        const result = await enqueueWhatsAppTemplateJob({
            phone: VALID_PHONE_RAW,
            templateId: 'welcome_v1',
            variables: { name: 'John', age: 30 },
        });

        expect(result.duplicated).toBe(false);
        expect(result.status).toBe('pending');
        expect(result.internalMessageId).toContain('send_template_');

        const createCall = mockCreate.mock.calls[0][0];
        const storedPayload = JSON.parse(createCall.data.payload);
        expect(storedPayload.intent).toBe('SEND_TEMPLATE');
        expect(storedPayload.templateId).toBe('welcome_v1');
        expect(storedPayload.variables).toEqual({ name: 'John', age: 30 });
    });

    it('enqueues a template message with templateContent', async () => {
        const result = await enqueueWhatsAppTemplateJob({
            phone: VALID_PHONE_RAW,
            templateContent: 'Hello {{name}}!',
        });

        expect(result.duplicated).toBe(false);
        const createCall = mockCreate.mock.calls[0][0];
        const storedPayload = JSON.parse(createCall.data.payload);
        expect(storedPayload.templateContent).toBe('Hello {{name}}!');
    });

    it('throws when neither templateId nor templateContent provided', async () => {
        await expect(
            enqueueWhatsAppTemplateJob({ phone: VALID_PHONE_RAW }),
        ).rejects.toThrow();
    });

    it('defaults variables to empty object', async () => {
        await enqueueWhatsAppTemplateJob({
            phone: VALID_PHONE_RAW,
            templateId: 'test_tpl',
        });

        const createCall = mockCreate.mock.calls[0][0];
        const storedPayload = JSON.parse(createCall.data.payload);
        expect(storedPayload.variables).toEqual({});
    });
});

// ----- enqueueWhatsAppDocumentJob -----
describe('enqueueWhatsAppDocumentJob', () => {
    it('enqueues a document with all fields', async () => {
        const result = await enqueueWhatsAppDocumentJob({
            phone: VALID_PHONE_RAW,
            fileName: 'report.pdf',
            mimeType: 'application/pdf',
            caption: 'Monthly report',
            documentBase64: 'dGVzdA==',
        });

        expect(result.duplicated).toBe(false);
        expect(result.status).toBe('pending');

        const createCall = mockCreate.mock.calls[0][0];
        const storedPayload = JSON.parse(createCall.data.payload);
        expect(storedPayload.intent).toBe('SEND_DOCUMENT');
        expect(storedPayload.fileName).toBe('report.pdf');
        expect(storedPayload.mimeType).toBe('application/pdf');
        expect(storedPayload.caption).toBe('Monthly report');
        expect(storedPayload.documentBase64).toBe('dGVzdA==');
    });

    it('uses default mimeType and caption', async () => {
        await enqueueWhatsAppDocumentJob({
            phone: VALID_PHONE_RAW,
            fileName: 'doc.pdf',
            documentBase64: 'dGVzdA==',
        });

        const createCall = mockCreate.mock.calls[0][0];
        const storedPayload = JSON.parse(createCall.data.payload);
        expect(storedPayload.mimeType).toBe('application/pdf');
        expect(storedPayload.caption).toBe('');
    });
});

// ----- enqueueWhatsAppPropostaJob -----
describe('enqueueWhatsAppPropostaJob', () => {
    it('enqueues a proposta job', async () => {
        const result = await enqueueWhatsAppPropostaJob({
            phone: VALID_PHONE_RAW,
            orcamentoId: 'orc-123',
        });

        expect(result.duplicated).toBe(false);
        expect(result.status).toBe('pending');

        const createCall = mockCreate.mock.calls[0][0];
        const storedPayload = JSON.parse(createCall.data.payload);
        expect(storedPayload.intent).toBe('SEND_PROPOSTA');
        expect(storedPayload.orcamentoId).toBe('orc-123');
    });

    it('throws for empty orcamentoId', async () => {
        await expect(
            enqueueWhatsAppPropostaJob({ phone: VALID_PHONE_RAW, orcamentoId: '' }),
        ).rejects.toThrow();
    });
});

// ----- enqueueWhatsAppContratoJob -----
describe('enqueueWhatsAppContratoJob', () => {
    it('enqueues a contrato job', async () => {
        const result = await enqueueWhatsAppContratoJob({
            phone: VALID_PHONE_RAW,
            orcamentoId: 'orc-456',
        });

        expect(result.duplicated).toBe(false);
        expect(result.status).toBe('pending');

        const createCall = mockCreate.mock.calls[0][0];
        const storedPayload = JSON.parse(createCall.data.payload);
        expect(storedPayload.intent).toBe('SEND_CONTRATO');
        expect(storedPayload.orcamentoId).toBe('orc-456');
    });

    it('throws for empty orcamentoId', async () => {
        await expect(
            enqueueWhatsAppContratoJob({ phone: VALID_PHONE_RAW, orcamentoId: '' }),
        ).rejects.toThrow();
    });
});

// ----- enqueueWhatsAppPayload -----
describe('enqueueWhatsAppPayload', () => {
    it('enqueues a raw validated payload', async () => {
        const now = new Date().toISOString();
        const payload = {
            channel: 'whatsapp' as const,
            intent: 'SEND_TEXT' as const,
            text: 'raw payload test',
            idempotencyKey: 'raw-key-12345678',
            internalMessageId: 'raw-internal-12345678',
            createdAt: now,
        };

        const result = await enqueueWhatsAppPayload(payload, VALID_PHONE);

        expect(result.duplicated).toBe(false);
        expect(result.status).toBe('pending');
        expect(result.phone).toBe(VALID_PHONE);
        expect(mockCreate).toHaveBeenCalledOnce();
    });

    it('passes scheduledAt through', async () => {
        const now = new Date().toISOString();
        const scheduled = new Date('2026-06-15T12:00:00Z');
        const payload = {
            channel: 'whatsapp' as const,
            intent: 'SEND_TEXT' as const,
            text: 'scheduled',
            idempotencyKey: 'sched-key-12345678',
            internalMessageId: 'sched-internal-12345678',
            createdAt: now,
        };

        await enqueueWhatsAppPayload(payload, VALID_PHONE, scheduled);

        const createCall = mockCreate.mock.calls[0][0];
        expect(createCall.data.scheduledAt).toEqual(scheduled);
    });

    it('returns duplicate when idempotency key exists', async () => {
        mockFindFirst.mockResolvedValue({
            id: 'existing-queue-id',
            idempotencyKey: 'dup-key-12345678',
            internalMessageId: 'existing-msg-id',
            status: 'sending',
            phone: VALID_PHONE,
        });

        const now = new Date().toISOString();
        const payload = {
            channel: 'whatsapp' as const,
            intent: 'SEND_TEXT' as const,
            text: 'duplicate test',
            idempotencyKey: 'dup-key-12345678',
            internalMessageId: 'new-internal-12345678',
            createdAt: now,
        };

        const result = await enqueueWhatsAppPayload(payload, VALID_PHONE);

        expect(result.duplicated).toBe(true);
        expect(result.queueItemId).toBe('existing-queue-id');
        expect(result.status).toBe('sending');
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it('rejects invalid payload schema', async () => {
        const badPayload = {
            channel: 'whatsapp',
            intent: 'INVALID_INTENT',
        } as any;

        await expect(
            enqueueWhatsAppPayload(badPayload, VALID_PHONE),
        ).rejects.toThrow();
    });
});

// ----- Edge cases for upsertByIdempotency -----
describe('upsertByIdempotency edge cases', () => {
    it('handles existing record with null fields gracefully', async () => {
        mockFindFirst.mockResolvedValue({
            id: 'existing-id',
            idempotencyKey: null,
            internalMessageId: null,
            status: null,
            phone: VALID_PHONE,
        });

        const result = await enqueueWhatsAppTextJob({
            phone: VALID_PHONE_RAW,
            text: 'test',
            idempotencyKey: 'fallback-key-1234',
        });

        expect(result.duplicated).toBe(true);
        // Falls back to payload values when existing fields are null
        expect(result.idempotencyKey).toBe('fallback-key-1234');
        expect(result.status).toBe('pending');
    });

    it('propagates database create errors', async () => {
        mockCreate.mockRejectedValue(new Error('DB connection failed'));

        await expect(
            enqueueWhatsAppTextJob({ phone: VALID_PHONE_RAW, text: 'fail' }),
        ).rejects.toThrow('DB connection failed');
    });

    it('propagates database findFirst errors', async () => {
        mockFindFirst.mockRejectedValue(new Error('DB read error'));

        await expect(
            enqueueWhatsAppTextJob({ phone: VALID_PHONE_RAW, text: 'fail' }),
        ).rejects.toThrow('DB read error');
    });
});
