import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withRequestContext } from '@/lib/api/with-request-context';
import { E, fail, ok } from '@/lib/api/response';
import logger from '@/lib/observability/logger';

const VALID_ACTIONS = ['confirmar', 'confirmar_t24', 'confirmar_t2', 'concluir', 'cancelar'] as const;

const AlocacaoPatchSchema = z.object({
    action: z.enum(VALID_ACTIONS),
});

const patchHandler = async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const guard = await guardCapability('MANAGE_ALOCACOES');
    if (guard instanceof NextResponse) return guard;

    try {
        const { id } = await params;
        const body = await request.json();

        const parsed = AlocacaoPatchSchema.safeParse(body);
        if (!parsed.success) {
            return fail(E.VALIDATION_ERROR, 'Ação inválida. Valores aceitos: ' + VALID_ACTIONS.join(', '), {
                status: 400,
                details: parsed.error.issues,
            });
        }

        const { action } = parsed.data;
        let updateData: Record<string, unknown> = {};

        switch (action) {
            case 'confirmar':
                updateData = { status: 'CONFIRMADO', respondidoEm: new Date() };
                break;
            case 'confirmar_t24':
                updateData = { confirmadoT24: new Date() };
                break;
            case 'confirmar_t2':
                updateData = { confirmadoT2: new Date(), status: 'EM_ANDAMENTO' };
                break;
            case 'concluir':
                updateData = { status: 'CONCLUIDO' };
                break;
            case 'cancelar':
                updateData = { status: 'CANCELADO' };
                break;
        }

        const alocacao = await prisma.alocacao.update({
            where: { id },
            data: updateData,
            include: { cuidador: true, paciente: true },
        });

        await logger.info('alocacao_update', `Alocação ${id}: ${action}`, {
            alocacaoId: id,
            action,
        });

        return ok({ alocacao });
    } catch (error) {
        await logger.error('alocacao_update', 'Erro ao atualizar alocação', error instanceof Error ? error : undefined);
        return fail(E.INTERNAL_ERROR, 'Erro ao atualizar alocação', { status: 500 });
    }
};

export const PATCH = withRequestContext(patchHandler as any);
