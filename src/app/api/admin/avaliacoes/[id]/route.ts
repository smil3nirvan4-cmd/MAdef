import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { getDbSchemaCapabilities } from '@/lib/db/schema-capabilities';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { ok, fail, E } from '@/lib/api/response';
import { parseBody, isFailResponse } from '@/lib/api/parse-body';
import { z } from 'zod';

const patchSchema = z.object({ action: z.string().optional() }).passthrough();

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

    try {
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
            return fail(E.NOT_FOUND, 'Avaliacao nao encontrada', { status: 404 });
        }

        return ok({ avaliacao });
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

    const body = await parseBody(request, patchSchema);
    if (isFailResponse(body)) return body;

    const { action } = body;

    let updateData: any = {};

    switch (action) {
        case 'enviar_proposta':
            return fail(E.VALIDATION_ERROR, 'Use POST /api/admin/avaliacoes/[id]/send-proposta para enfileirar envio.', { status: 400 });
        case 'enviar_contrato':
            return fail(E.VALIDATION_ERROR, 'Use POST /api/admin/avaliacoes/[id]/send-contrato para enfileirar envio.', { status: 400 });
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
            updateData = body;
    }

    const avaliacao = await prisma.avaliacao.update({
        where: { id },
        data: updateData,
        include: { paciente: true },
    });

    return ok({ avaliacao });
}

async function handleDelete(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await guardCapability('MANAGE_AVALIACOES');
    if (guard instanceof NextResponse) return guard;

    const { id } = await params;
    await prisma.avaliacao.delete({ where: { id } });
    return ok({ success: true });
}

export const GET = withErrorBoundary(handleGet);
export const PATCH = withRateLimit(withErrorBoundary(handlePatch), { max: 20, windowSec: 60 });
export const DELETE = withRateLimit(withErrorBoundary(handleDelete), { max: 5, windowSec: 60 });
