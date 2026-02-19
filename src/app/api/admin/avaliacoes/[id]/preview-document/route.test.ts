import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
    guardCapability: vi.fn(),
    parseOrcamentoSendOptions: vi.fn(),
    avaliacaoFindUnique: vi.fn(),
    orcamentoFindUnique: vi.fn(),
    orcamentoFindFirst: vi.fn(),
    getDbSchemaCapabilities: vi.fn(),
    buildOrcamentoPDFData: vi.fn(),
    renderCommercialMessage: vi.fn(),
}));

vi.mock('@/lib/documents/send-options', () => ({
    parseOrcamentoSendOptions: mocks.parseOrcamentoSendOptions,
}));

vi.mock('@/lib/auth/capability-guard', () => ({
    guardCapability: mocks.guardCapability,
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
    },
}));

vi.mock('@/lib/db/schema-capabilities', () => ({
    getDbSchemaCapabilities: mocks.getDbSchemaCapabilities,
}));

vi.mock('@/lib/documents/build-pdf-data', () => ({
    buildOrcamentoPDFData: mocks.buildOrcamentoPDFData,
}));

vi.mock('@/lib/documents/commercial-message', () => ({
    renderCommercialMessage: mocks.renderCommercialMessage,
}));

import { POST } from './route';

function req(body: unknown): NextRequest {
    return new Request('https://example.com/api/admin/avaliacoes/av1/preview-document', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    }) as unknown as NextRequest;
}

describe('POST /api/admin/avaliacoes/[id]/preview-document', () => {
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
            paciente: { nome: 'Paciente' },
        });
        mocks.orcamentoFindFirst.mockResolvedValue({
            id: 'orc1',
            pacienteId: 'pac1',
            createdAt: new Date().toISOString(),
        });
        mocks.buildOrcamentoPDFData.mockReturnValue({
            referencia: '20260219-001',
            configuracaoComercial: { valorLiquido: 409.11 },
        });
        mocks.renderCommercialMessage.mockReturnValue({
            template: 'tmpl',
            rendered: 'msg',
            missingVariables: [],
            variables: { nome: 'Paciente' },
        });
    });

    it('returns preview data in normal path', async () => {
        const response = await POST(req({ kind: 'proposta' }), { params: Promise.resolve({ id: 'av1' }) });
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.success).toBe(true);
        expect(payload.data.kind).toBe('proposta');
        expect(payload.data.previewMessage).toBe('msg');
        expect(payload.data.pdfPreview.endpoint).toBe('/api/admin/orcamentos/orc1/gerar-proposta');
    });
});
