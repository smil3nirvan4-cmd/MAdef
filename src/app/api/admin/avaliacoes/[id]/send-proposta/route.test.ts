import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
    guardCapability: vi.fn(),
    parseOrcamentoSendOptions: vi.fn(),
    avaliacaoFindUnique: vi.fn(),
    orcamentoFindUnique: vi.fn(),
    orcamentoFindFirst: vi.fn(),
    queueFindUnique: vi.fn(),
    enqueueWhatsAppPropostaJob: vi.fn(),
    processWhatsAppOutboxOnce: vi.fn(),
    loggerWarning: vi.fn(),
    loggerWhatsapp: vi.fn(),
    getDbSchemaCapabilities: vi.fn(),
}));

vi.mock('@/lib/auth/capability-guard', () => ({
    guardCapability: mocks.guardCapability,
}));

vi.mock('@/lib/documents/send-options', () => ({
    parseOrcamentoSendOptions: mocks.parseOrcamentoSendOptions,
}));

vi.mock('@/lib/prisma', () => ({
    prisma: {
        avaliacao: {
            findUnique: mocks.avaliacaoFindUnique,
        },
        orcamento: {
            findUnique: mocks.orcamentoFindUnique,
            findFirst: mocks.orcamentoFindFirst,
        },
        whatsAppQueueItem: {
            findUnique: mocks.queueFindUnique,
        },
    },
}));

vi.mock('@/lib/whatsapp/outbox/service', () => ({
    enqueueWhatsAppPropostaJob: mocks.enqueueWhatsAppPropostaJob,
}));

vi.mock('@/lib/whatsapp/outbox/worker', () => ({
    processWhatsAppOutboxOnce: mocks.processWhatsAppOutboxOnce,
}));

vi.mock('@/lib/logger', () => ({
    default: {
        warning: mocks.loggerWarning,
        whatsapp: mocks.loggerWhatsapp,
    },
}));

vi.mock('@/lib/db/schema-capabilities', () => ({
    getDbSchemaCapabilities: mocks.getDbSchemaCapabilities,
}));

import { POST } from './route';

function req(body: unknown): NextRequest {
    return new Request('https://example.com/api/admin/avaliacoes/av1/send-proposta', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    }) as unknown as NextRequest;
}

describe('POST /api/admin/avaliacoes/[id]/send-proposta', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.guardCapability.mockResolvedValue(null);
        mocks.parseOrcamentoSendOptions.mockReturnValue(undefined);
        mocks.getDbSchemaCapabilities.mockResolvedValue({
            dbSchemaOk: true,
            missingColumns: [],
            databaseProvider: 'sqlite',
            databaseTarget: 'prisma/dev.db',
            checkedAt: new Date().toISOString(),
        });
        mocks.avaliacaoFindUnique.mockResolvedValue({
            id: 'av1',
            pacienteId: 'pac1',
            paciente: { telefone: '5511999999999' },
        });
        mocks.orcamentoFindFirst.mockResolvedValue({ id: 'orc1' });
        mocks.enqueueWhatsAppPropostaJob.mockResolvedValue({
            queueItemId: 'q1',
            internalMessageId: 'im1',
        });
        mocks.processWhatsAppOutboxOnce.mockResolvedValue({ processed: 1 });
        mocks.queueFindUnique.mockResolvedValue({ id: 'q1', status: 'sent', providerMessageId: 'pm1' });
    });

    it('returns 200 in normal path', async () => {
        const response = await POST(req({}), { params: Promise.resolve({ id: 'av1' }) });
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.success).toBe(true);
        expect(payload.data.queueItemId).toBe('q1');
        expect(mocks.orcamentoFindFirst).toHaveBeenCalledTimes(1);
    });

    it('returns 503 when schema guard detects drift', async () => {
        mocks.getDbSchemaCapabilities.mockResolvedValueOnce({
            dbSchemaOk: false,
            missingColumns: ['Orcamento.auditHash'],
            databaseProvider: 'sqlite',
            databaseTarget: 'prisma/dev.db',
            checkedAt: new Date().toISOString(),
        });

        const response = await POST(req({}), { params: Promise.resolve({ id: 'av1' }) });
        const payload = await response.json();

        expect(response.status).toBe(503);
        expect(payload.success).toBe(false);
        expect(payload.error.details.action).toBe('db_schema_drift');
        expect(mocks.loggerWarning).toHaveBeenCalledTimes(1);
    });

    it('returns 503 when Prisma throws P2022 while querying Orcamento', async () => {
        mocks.orcamentoFindFirst.mockRejectedValueOnce({
            code: 'P2022',
            message: 'The column `main.Orcamento.auditHash` does not exist in the current database.',
        });

        const response = await POST(req({}), { params: Promise.resolve({ id: 'av1' }) });
        const payload = await response.json();

        expect(response.status).toBe(503);
        expect(payload.success).toBe(false);
        expect(payload.error.details.column).toBe('auditHash');
        expect(mocks.loggerWarning).toHaveBeenCalledTimes(1);
    });
});
