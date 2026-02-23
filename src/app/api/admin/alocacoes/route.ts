import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { alocacaoRepository } from '@/lib/repositories';
import { guardCapability } from '@/lib/auth/capability-guard';
import { parseBody } from '@/lib/api/parse-body';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';

const createAlocacaoSchema = z.object({
    cuidadorId: z.string().min(1),
    pacienteId: z.string().optional(),
    slotId: z.string().min(1),
    turno: z.string().optional().default('DIURNO'),
    diaSemana: z.number().optional().default(0),
    dataInicio: z.string().optional(),
    hospital: z.string().optional(),
    quarto: z.string().optional(),
});

async function handleGet(request: NextRequest) {
    const guard = await guardCapability('MANAGE_ALOCACOES');
    if (guard instanceof NextResponse) return guard;

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const cuidadorId = searchParams.get('cuidadorId');
    const pacienteId = searchParams.get('pacienteId');

    const status = statusParam && statusParam !== 'ALL' ? statusParam : undefined;

    const { data: alocacoes } = await alocacaoRepository.findAll({
        status: status || undefined,
        cuidadorId: cuidadorId || undefined,
        pacienteId: pacienteId || undefined,
    });

    const countByStatus = await alocacaoRepository.countByStatus();
    const stats = {
        total: countByStatus.total,
        pendentes: countByStatus.pendente,
        confirmadas: countByStatus.confirmado,
        emAndamento: countByStatus.andamento,
        concluidas: countByStatus.concluido,
    };

    return NextResponse.json({ alocacoes, stats });
}

async function handlePost(request: NextRequest) {
    const guard = await guardCapability('MANAGE_ALOCACOES');
    if (guard instanceof NextResponse) return guard;

    const { data, error } = await parseBody(request, createAlocacaoSchema);
    if (error) return error;
    const { cuidadorId, pacienteId, slotId, turno, diaSemana, dataInicio, hospital, quarto } = data;

    const alocacao = await alocacaoRepository.create({
        cuidador: { connect: { id: cuidadorId } },
        ...(pacienteId ? { paciente: { connect: { id: pacienteId } } } : {}),
        slotId,
        turno,
        diaSemana,
        dataInicio: dataInicio ? new Date(dataInicio) : new Date(),
        hospital,
        quarto,
        status: 'PENDENTE_FEEDBACK',
    });

    return NextResponse.json({ success: true, alocacao });
}

export const GET = withRateLimit(withErrorBoundary(handleGet), { max: 30, windowMs: 60_000 });
export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 10, windowMs: 60_000 });
