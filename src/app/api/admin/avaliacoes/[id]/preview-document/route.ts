export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { E, fail, ok } from '@/lib/api/response';
import { parseOrcamentoSendOptions } from '@/lib/documents/send-options';
import { buildOrcamentoPDFData } from '@/lib/documents/build-pdf-data';
import { renderCommercialMessage } from '@/lib/documents/commercial-message';
import { getDbSchemaCapabilities } from '@/lib/db/schema-capabilities';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';

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
    try {
        const { id: avaliacaoId } = await params;
        const body = await request.json().catch(() => ({}));
        const kind = normalizeKind(body?.kind);
        const tipo = kind === 'proposta' ? 'PROPOSTA' : 'CONTRATO';
        const guard = await guardCapability(kind === 'proposta' ? 'SEND_PROPOSTA' : 'SEND_CONTRATO');
        if (guard instanceof NextResponse) {
            return guard;
        }

        let sendOptions;
        try {
            sendOptions = parseOrcamentoSendOptions(body);
        } catch (error) {
            return fail(E.VALIDATION_ERROR, error instanceof Error ? error.message : 'Opcoes de preview invalidas', {
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
            return fail(E.NOT_FOUND, 'Orcamento nao encontrado para esta avaliacao', { status: 404 });
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
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao montar preview de documento';
        return NextResponse.json({
            success: false,
            error: { code: E.DATABASE_ERROR, message },
        }, { status: 500 });
    }
}

export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 10, windowMs: 60_000 });
