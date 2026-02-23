export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { E, fail, ok } from '@/lib/api/response';
import { parseBody } from '@/lib/api/parse-body';
import { parseOrcamentoSendOptions } from '@/lib/documents/send-options';
import { buildOrcamentoPDFData } from '@/lib/documents/build-pdf-data';
import { renderCommercialMessage } from '@/lib/documents/commercial-message';
import { getDbSchemaCapabilities } from '@/lib/db/schema-capabilities';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { NotFoundError, ValidationError } from '@/lib/errors';

const previewDocumentSchema = z.object({
    kind: z.string().optional(),
    orcamentoId: z.string().optional(),
}).passthrough();

type PreviewKind = 'proposta' | 'contrato';

function normalizeKind(value: unknown): PreviewKind {
    const normalized = String(value || 'proposta').trim().toLowerCase();
    return normalized === 'contrato' ? 'contrato' : 'proposta';
}

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

async function handlePost(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id: avaliacaoId } = await params;
    const { data: body, error } = await parseBody(request, previewDocumentSchema);
    if (error) return error;
    const kind = normalizeKind(body?.kind);
    const tipo = kind === 'proposta' ? 'PROPOSTA' : 'CONTRATO';
    const guard = await guardCapability(kind === 'proposta' ? 'SEND_PROPOSTA' : 'SEND_CONTRATO');
    if (guard instanceof NextResponse) {
        return guard;
    }

    let sendOptions;
    try {
        sendOptions = parseOrcamentoSendOptions(body);
    } catch (err) {
        throw new ValidationError(err instanceof Error ? err.message : 'Opcoes de preview invalidas');
    }

    const avaliacao = await prisma.avaliacao.findUnique({
        where: { id: avaliacaoId },
        include: { paciente: true },
    });

    if (!avaliacao) {
        throw new NotFoundError('Avaliacao', avaliacaoId);
    }

    const schemaCapabilities = await getDbSchemaCapabilities();
    if (!schemaCapabilities.dbSchemaOk) {
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
        throw new NotFoundError('Orcamento');
    }

    const pdfData = buildOrcamentoPDFData(
        avaliacao as unknown as Record<string, unknown>,
        orcamento as unknown as Record<string, unknown>,
        tipo,
        sendOptions,
    );
    const mensagem = renderCommercialMessage({
        tipo,
        pacienteNome: String(avaliacao.paciente?.nome || 'Paciente'),
        pdfData,
        avaliacao: avaliacao as unknown as Record<string, unknown>,
        orcamento: orcamento as unknown as Record<string, unknown>,
        sendOptions,
    });
    const endpoint = `/api/admin/orcamentos/${orcamento.id}/${kind === 'proposta' ? 'gerar-proposta' : 'gerar-contrato'}`;

    return ok({
        kind,
        tipo,
        orcamentoId: orcamento.id,
        pacienteNome: avaliacao.paciente?.nome || 'Paciente',
        template: mensagem.template,
        previewMessage: mensagem.rendered,
        missingVariables: mensagem.missingVariables,
        variables: mensagem.variables,
        configuracaoComercial: pdfData.configuracaoComercial,
        pdfPreview: {
            endpoint,
            method: 'POST',
            payload: sendOptions || {},
            fileName: `${tipo === 'PROPOSTA' ? 'Proposta' : 'Contrato'}_${pdfData.referencia}_MaosAmigas.pdf`,
        },
    });
}

export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 10, windowMs: 60_000 });
