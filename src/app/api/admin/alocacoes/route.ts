import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { ok, fail, E } from '@/lib/api/response';
import { parseBody, isFailResponse } from '@/lib/api/parse-body';
import { z } from 'zod';

const postSchema = z.object({
    cuidadorId: z.string().min(1),
    slotId: z.string().min(1),
    pacienteId: z.string().optional(),
    turno: z.string().optional(),
    diaSemana: z.number().optional(),
    dataInicio: z.string().optional(),
    hospital: z.string().optional(),
    quarto: z.string().optional(),
});

async function handleGet(request: NextRequest) {
    const guard = await guardCapability('MANAGE_ALOCACOES');
    if (guard instanceof NextResponse) return guard;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const cuidadorId = searchParams.get('cuidadorId');
    const pacienteId = searchParams.get('pacienteId');

    const where: any = {};

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
                }
            },
            paciente: {
                select: {
                    id: true,
                    nome: true,
                    telefone: true,
                    hospital: true,
                    quarto: true,
                }
            }
        },
        orderBy: { dataInicio: 'desc' },
        take: 200
    });

    // Stats
    const stats = {
        total: await prisma.alocacao.count(),
        pendentes: await prisma.alocacao.count({ where: { status: 'PENDENTE_FEEDBACK' } }),
        confirmadas: await prisma.alocacao.count({ where: { status: 'CONFIRMADO' } }),
        emAndamento: await prisma.alocacao.count({ where: { status: 'EM_ANDAMENTO' } }),
        concluidas: await prisma.alocacao.count({ where: { status: 'CONCLUIDO' } }),
    };

    return ok({ alocacoes, stats });
}

async function handlePost(request: NextRequest) {
    const guard = await guardCapability('MANAGE_ALOCACOES');
    if (guard instanceof NextResponse) return guard;

    const body = await parseBody(request, postSchema);
    if (isFailResponse(body)) return body;

    const { cuidadorId, pacienteId, slotId, turno, diaSemana, dataInicio, hospital, quarto } = body;

    const alocacao = await prisma.alocacao.create({
        data: {
            cuidadorId,
            pacienteId,
            slotId,
            turno: turno || 'DIURNO',
            diaSemana: diaSemana || 0,
            dataInicio: dataInicio ? new Date(dataInicio) : new Date(),
            hospital,
            quarto,
            status: 'PENDENTE_FEEDBACK',
        },
        include: {
            cuidador: true,
            paciente: true,
        }
    });

    return ok({ alocacao }, 201);
}

export const GET = withErrorBoundary(handleGet);
export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 20, windowSec: 60 });
