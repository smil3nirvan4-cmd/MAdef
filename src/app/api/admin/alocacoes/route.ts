import { NextRequest, NextResponse } from 'next/server';
import { alocacaoRepository } from '@/lib/repositories/alocacao.repository';
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
    const status = searchParams.get('status') || undefined;
    const cuidadorId = searchParams.get('cuidadorId') || undefined;
    const pacienteId = searchParams.get('pacienteId') || undefined;

    const { alocacoes, stats } = await alocacaoRepository.findAll({ status, cuidadorId, pacienteId });

    return ok({ alocacoes, stats });
}

async function handlePost(request: NextRequest) {
    const guard = await guardCapability('MANAGE_ALOCACOES');
    if (guard instanceof NextResponse) return guard;

    const body = await parseBody(request, postSchema);
    if (isFailResponse(body)) return body;

    const { cuidadorId, pacienteId, slotId, turno, diaSemana, dataInicio, hospital, quarto } = body;

    const alocacao = await alocacaoRepository.create({
        cuidador: { connect: { id: cuidadorId } },
        ...(pacienteId && { paciente: { connect: { id: pacienteId } } }),
        slotId,
        turno: turno || 'DIURNO',
        diaSemana: diaSemana || 0,
        dataInicio: dataInicio ? new Date(dataInicio) : new Date(),
        hospital,
        quarto,
        status: 'PENDENTE_FEEDBACK',
    });

    return ok({ alocacao }, 201);
}

export const GET = withErrorBoundary(handleGet);
export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 20, windowSec: 60 });
