import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { getDbSchemaCapabilities } from '@/lib/db/schema-capabilities';
import { E, fail } from '@/lib/api/response';
import { guardCapability } from '@/lib/auth/capability-guard';
import { parseBody } from '@/lib/api/parse-body';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';

const patchAvaliacaoSchema = z.object({
    action: z.string().optional(),
}).passthrough();

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

async function handleGet(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const guard = await guardCapability('VIEW_AVALIACOES');
        if (guard instanceof NextResponse) return guard;

        const { id } = await params;
        const schemaCapabilities = await getDbSchemaCapabilities();
        if (!schemaCapabilities.dbSchemaOk) {
            await logger.warning('db_schema_drift', 'Schema desatualizado ao carregar detalhes da avaliacao', {
                table: 'Orcamento',
                column: 'auditHash',
                missingColumns: schemaCapabilities.missingColumns,
                avaliacaoId: id,
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

        const avaliacao = await prisma.avaliacao.findUnique({
            where: { id },
            include: {
                paciente: {
                    include: {
                        mensagens: { orderBy: { timestamp: 'desc' }, take: 50 },
                        orcamentos: { orderBy: { createdAt: 'desc' }, take: 5 },
                    },
                },
            },
        });

        if (!avaliacao) {
            return NextResponse.json({ error: 'Avaliacao nao encontrada' }, { status: 404 });
        }

        return NextResponse.json({ avaliacao });
    } catch (error) {
        if (isMissingColumnError(error)) {
            const resolved = resolveMissingColumn(error);
            await logger.warning('db_schema_drift', 'P2022 ao carregar detalhes da avaliacao', {
                table: resolved.table,
                column: resolved.column,
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

        throw error;
    }
}

async function handlePatch(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await guardCapability('MANAGE_AVALIACOES');
    if (guard instanceof NextResponse) return guard;

    const { id } = await params;
    const { data, error } = await parseBody(request, patchAvaliacaoSchema);
    if (error) return error;
    const { action } = data;

    let updateData: any = {};

    switch (action) {
        case 'enviar_proposta':
            return NextResponse.json(
                {
                    success: false,
                    error: 'Use POST /api/admin/avaliacoes/[id]/send-proposta para enfileirar envio.',
                },
                { status: 400 }
            );
        case 'enviar_contrato':
            return NextResponse.json(
                {
                    success: false,
                    error: 'Use POST /api/admin/avaliacoes/[id]/send-contrato para enfileirar envio.',
                },
                { status: 400 }
            );
        case 'aprovar':
            updateData = { status: 'APROVADA', validadoEm: new Date() };
            break;
        case 'rejeitar':
            updateData = { status: 'REJEITADA', validadoEm: new Date() };
            break;
        case 'concluir':
            updateData = { status: 'CONCLUIDA' };
            break;
        default:
            updateData = data;
    }

    const avaliacao = await prisma.avaliacao.update({
        where: { id },
        data: updateData,
        include: { paciente: true },
    });

    return NextResponse.json({ success: true, avaliacao });
}

async function handleDelete(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await guardCapability('MANAGE_AVALIACOES');
    if (guard instanceof NextResponse) return guard;

    const { id } = await params;
    await prisma.avaliacao.delete({ where: { id } });
    return NextResponse.json({ success: true });
}

export const GET = withRateLimit(withErrorBoundary(handleGet), { max: 30, windowMs: 60_000 });
export const PATCH = withRateLimit(withErrorBoundary(handlePatch), { max: 10, windowMs: 60_000 });
export const DELETE = withRateLimit(withErrorBoundary(handleDelete), { max: 5, windowMs: 60_000 });
