import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/observability/logger';
import { getDbSchemaCapabilities } from '@/lib/db/schema-capabilities';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withRequestContext } from '@/lib/api/with-request-context';
import { E, fail, ok } from '@/lib/api/response';

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

const VALID_ACTIONS = ['aprovar', 'rejeitar', 'concluir'] as const;

const AvaliacaoPatchSchema = z.union([
    z.object({
        action: z.enum(VALID_ACTIONS),
    }),
    z.object({
        action: z.literal('enviar_proposta'),
    }),
    z.object({
        action: z.literal('enviar_contrato'),
    }),
    z.record(z.string(), z.unknown()),
]);

const getHandler = async (
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const guard = await guardCapability('VIEW_AVALIACOES');
    if (guard instanceof NextResponse) return guard;

    try {
        const { id } = await params;
        const schemaCapabilities = await getDbSchemaCapabilities();
        if (!schemaCapabilities.dbSchemaOk) {
            await logger.warning('db_schema_drift', 'Schema desatualizado ao carregar detalhes da avaliacao', {
                table: 'Orcamento',
                column: 'auditHash',
                missingColumns: schemaCapabilities.missingColumns,
                avaliacaoId: id,
            });
            // Non-blocking: continue loading avaliacao, frontend will show schema warning
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
            return fail(E.NOT_FOUND, 'Avaliação não encontrada', { status: 404 });
        }

        return ok({
            avaliacao,
            dbSchemaOk: schemaCapabilities.dbSchemaOk,
            missingColumns: schemaCapabilities.missingColumns,
        });
    } catch (error) {
        if (isMissingColumnError(error)) {
            const resolved = resolveMissingColumn(error);
            await logger.warning('db_schema_drift', 'P2022 ao carregar detalhes da avaliacao – fallback sem orcamentos', {
                table: resolved.table,
                column: resolved.column,
            });
            // Retry without orcamentos include to bypass missing-column error
            try {
                const { id: fallbackId } = await params;
                const avaliacao = await prisma.avaliacao.findUnique({
                    where: { id: fallbackId },
                    include: {
                        paciente: {
                            include: {
                                mensagens: { orderBy: { timestamp: 'desc' }, take: 50 },
                            },
                        },
                    },
                });
                if (!avaliacao) {
                    return fail(E.NOT_FOUND, 'Avaliação não encontrada', { status: 404 });
                }
                // Attach empty orcamentos so frontend doesn't break
                const avaliacaoWithOrcamentos = {
                    ...avaliacao,
                    paciente: { ...avaliacao.paciente, orcamentos: [] },
                };
                return ok({
                    avaliacao: avaliacaoWithOrcamentos,
                    dbSchemaOk: false,
                    missingColumns: [`${resolved.table}.${resolved.column}`],
                });
            } catch (fallbackError) {
                await logger.error('avaliacao_get', 'Erro no fallback sem orcamentos', fallbackError instanceof Error ? fallbackError : undefined);
                return fail(E.INTERNAL_ERROR, 'Erro ao buscar avaliação', { status: 500 });
            }
        }

        await logger.error('avaliacao_get', 'Erro ao buscar avaliacao', error instanceof Error ? error : undefined);
        return fail(E.INTERNAL_ERROR, 'Erro ao buscar avaliação', { status: 500 });
    }
};

const patchHandler = async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const guard = await guardCapability('MANAGE_AVALIACOES');
    if (guard instanceof NextResponse) return guard;

    try {
        const { id } = await params;
        const body = await request.json();
        const { action } = body;

        if (action === 'enviar_proposta') {
            return fail(E.VALIDATION_ERROR, 'Use POST /api/admin/avaliacoes/[id]/send-proposta para enfileirar envio.', { status: 400 });
        }
        if (action === 'enviar_contrato') {
            return fail(E.VALIDATION_ERROR, 'Use POST /api/admin/avaliacoes/[id]/send-contrato para enfileirar envio.', { status: 400 });
        }

        let updateData: Record<string, unknown> = {};

        switch (action) {
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

        await logger.info('avaliacao_update', `Avaliação ${id} atualizada: ${action || 'campos'}`, {
            avaliacaoId: id,
            action: action || 'direct_update',
        });

        return ok({ avaliacao });
    } catch (error) {
        await logger.error('avaliacao_update', 'Erro ao atualizar avaliação', error instanceof Error ? error : undefined);
        return fail(E.INTERNAL_ERROR, 'Erro ao atualizar avaliação', { status: 500 });
    }
};

const deleteHandler = async (
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const guard = await guardCapability('MANAGE_AVALIACOES');
    if (guard instanceof NextResponse) return guard;

    try {
        const { id } = await params;
        await prisma.avaliacao.delete({ where: { id } });

        await logger.info('avaliacao_delete', `Avaliação ${id} excluída`, { avaliacaoId: id });

        return ok({ deleted: true });
    } catch (error) {
        await logger.error('avaliacao_delete', 'Erro ao excluir avaliação', error instanceof Error ? error : undefined);
        return fail(E.INTERNAL_ERROR, 'Erro ao excluir avaliação', { status: 500 });
    }
};

export const GET = withRequestContext(getHandler as any);
export const PATCH = withRequestContext(patchHandler as any);
export const DELETE = withRequestContext(deleteHandler as any);
