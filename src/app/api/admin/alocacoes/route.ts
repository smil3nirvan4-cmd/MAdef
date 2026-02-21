import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withRequestContext } from '@/lib/api/with-request-context';
import { E, fail, ok } from '@/lib/api/response';
import logger from '@/lib/observability/logger';

const AlocacaoCreateSchema = z.object({
    cuidadorId: z.string().min(1, 'cuidadorId é obrigatório'),
    pacienteId: z.string().optional(),
    slotId: z.string().min(1, 'slotId é obrigatório'),
    turno: z.enum(['DIURNO', 'NOTURNO', '24H']).default('DIURNO'),
    diaSemana: z.number().int().min(0).max(6).default(0),
    dataInicio: z.string().optional(),
    hospital: z.string().optional(),
    quarto: z.string().optional(),
});

const getHandler = async (request: NextRequest) => {
    const guard = await guardCapability('MANAGE_ALOCACOES');
    if (guard instanceof NextResponse) return guard;

    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const cuidadorId = searchParams.get('cuidadorId');
        const pacienteId = searchParams.get('pacienteId');

        const where: Record<string, unknown> = {};

        if (status && status !== 'ALL') {
            where.status = status;
        }
        if (cuidadorId) {
            where.cuidadorId = cuidadorId;
        }
        if (pacienteId) {
            where.pacienteId = pacienteId;
        }

        const alocacoes = await prisma.alocacao.findMany({
            where,
            include: {
                cuidador: {
                    select: {
                        id: true,
                        nome: true,
                        telefone: true,
                        area: true,
                    },
                },
                paciente: {
                    select: {
                        id: true,
                        nome: true,
                        telefone: true,
                        hospital: true,
                        quarto: true,
                    },
                },
            },
            orderBy: { dataInicio: 'desc' },
            take: 200,
        });

        const stats = {
            total: await prisma.alocacao.count(),
            pendentes: await prisma.alocacao.count({ where: { status: 'PENDENTE_FEEDBACK' } }),
            confirmadas: await prisma.alocacao.count({ where: { status: 'CONFIRMADO' } }),
            emAndamento: await prisma.alocacao.count({ where: { status: 'EM_ANDAMENTO' } }),
            concluidas: await prisma.alocacao.count({ where: { status: 'CONCLUIDO' } }),
        };

        return ok({ alocacoes, stats });
    } catch (error) {
        await logger.error('alocacoes_get', 'Erro ao buscar alocações', error instanceof Error ? error : undefined);
        return fail(E.INTERNAL_ERROR, 'Erro ao buscar alocações', { status: 500 });
    }
};

const postHandler = async (request: NextRequest) => {
    const guard = await guardCapability('MANAGE_ALOCACOES');
    if (guard instanceof NextResponse) return guard;

    try {
        const body = await request.json();
        const parsed = AlocacaoCreateSchema.safeParse(body);

        if (!parsed.success) {
            return fail(E.VALIDATION_ERROR, 'Dados inválidos', {
                status: 400,
                details: parsed.error.issues,
            });
        }

        const { cuidadorId, pacienteId, slotId, turno, diaSemana, dataInicio, hospital, quarto } = parsed.data;

        const alocacao = await prisma.alocacao.create({
            data: {
                cuidadorId,
                pacienteId,
                slotId,
                turno,
                diaSemana,
                dataInicio: dataInicio ? new Date(dataInicio) : new Date(),
                hospital,
                quarto,
                status: 'PENDENTE_FEEDBACK',
            },
            include: {
                cuidador: true,
                paciente: true,
            },
        });

        await logger.info('alocacao_create', `Alocação criada: ${alocacao.id}`, {
            alocacaoId: alocacao.id,
            cuidadorId,
            pacienteId,
        });

        return ok({ alocacao }, 201);
    } catch (error) {
        await logger.error('alocacao_create', 'Erro ao criar alocação', error instanceof Error ? error : undefined);
        return fail(E.INTERNAL_ERROR, 'Erro ao criar alocação', { status: 500 });
    }
};

export const GET = withRequestContext(getHandler);
export const POST = withRequestContext(postHandler);
