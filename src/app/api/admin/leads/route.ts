import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withRequestContext } from '@/lib/api/with-request-context';
import { E, fail, ok } from '@/lib/api/response';
import logger from '@/lib/observability/logger';

const LEAD_STATUSES = ['LEAD', 'AVALIACAO', 'PROPOSTA_ENVIADA', 'CONTRATO_ENVIADO'] as const;

const getHandler = async (request: NextRequest) => {
    const guard = await guardCapability('VIEW_PACIENTES');
    if (guard instanceof NextResponse) return guard;

    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const status = searchParams.get('status');

        const where: Record<string, unknown> = {
            status: { in: [...LEAD_STATUSES] },
        };

        if (status && status !== 'ALL') {
            where.status = status;
        }

        if (search) {
            where.OR = [
                { nome: { contains: search } },
                { telefone: { contains: search } },
            ];
        }

        const leads = await prisma.paciente.findMany({
            where,
            include: {
                _count: { select: { avaliacoes: true, mensagens: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });

        const stats = {
            total: await prisma.paciente.count({ where: { status: { in: [...LEAD_STATUSES] } } }),
            leads: await prisma.paciente.count({ where: { status: 'LEAD' } }),
            avaliacao: await prisma.paciente.count({ where: { status: 'AVALIACAO' } }),
            proposta: await prisma.paciente.count({ where: { status: 'PROPOSTA_ENVIADA' } }),
            contrato: await prisma.paciente.count({ where: { status: 'CONTRATO_ENVIADO' } }),
        };

        return ok({ leads, stats });
    } catch (error) {
        await logger.error('leads_get', 'Erro ao buscar leads', error instanceof Error ? error : undefined);
        return fail(E.INTERNAL_ERROR, 'Erro ao buscar leads', { status: 500 });
    }
};

export const GET = withRequestContext(getHandler);
