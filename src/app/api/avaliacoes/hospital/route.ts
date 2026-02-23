import { NextRequest, NextResponse } from 'next/server';
import { DB } from '@/lib/database';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { ok, fail, E } from '@/lib/api/response';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';
import logger from '@/lib/observability/logger';

export const POST = withErrorBoundary(async (request: NextRequest) => {
    const guard = await guardCapability('MANAGE_AVALIACOES');
    if (guard instanceof NextResponse) return guard;

    const ip = getClientIp(request);
    const rate = checkRateLimit(`hospital:${ip}`, 10, 60_000);
    if (!rate.allowed) {
        return fail(E.RATE_LIMITED, 'Rate limit exceeded', { status: 429 });
    }

    const body = await request.json();
    const { nome, hospital, quarto, nivel, phone } = body;

    if (!nome || !hospital || !nivel) {
        return fail(E.VALIDATION_ERROR, 'Campos obrigatórios ausentes: nome, hospital, nivel', { status: 400 });
    }

    const telefone = phone || `HOSP-${Date.now()}`;

    const paciente = await DB.paciente.upsert(telefone, {
        nome,
        tipo: 'HOSPITAL',
        hospital,
        quarto,
        status: 'PRIORIDADE_ALTA',
        prioridade: 'EMERGENCIA'
    });

    const avaliacao = await DB.avaliacao.create({
        pacienteId: paciente.id,
        nivelSugerido: nivel,
        cargaSugerida: '12x36',
        status: 'VALIDADA'
    });

    await logger.info('agil_flow_created', `Paciente criado via fluxo ágil hospitalar. Nível: ${nivel}`, {
        pacienteId: paciente.id,
        avaliacaoId: avaliacao.id,
        hospital,
        nivel,
    });

    return ok({ pacienteId: paciente.id, avaliacaoId: avaliacao.id });
});
