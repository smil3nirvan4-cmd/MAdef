import { NextRequest, NextResponse } from 'next/server';
import { gerarSlots24h } from '@/lib/allocation/slots';
import { executarAlocacaoImpositiva } from '@/lib/allocation/impositiva';
import { inicializarSlotsParaEscolha } from '@/lib/allocation/escolha';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { ok, fail, E } from '@/lib/api/response';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';

export const POST = withErrorBoundary(async (request: NextRequest) => {
    const guard = await guardCapability('MANAGE_ALOCACOES');
    if (guard instanceof NextResponse) return guard;

    const ip = getClientIp(request);
    const rate = checkRateLimit(`alocacao:${ip}`, 20, 60_000);
    if (!rate.allowed) {
        return fail(E.RATE_LIMITED, 'Rate limit exceeded', { status: 429 });
    }

    const { equipeId, pacienteId, modo, horasDiarias, duracaoDias, cuidadores } = await request.json();

    if (!equipeId || !pacienteId || !modo) {
        return fail(E.VALIDATION_ERROR, 'equipeId, pacienteId e modo são obrigatórios', { status: 400 });
    }

    const slots = gerarSlots24h(equipeId, new Date(), duracaoDias);

    const equipe = {
        id: equipeId,
        pacienteId,
        duracaoDias,
        horasDiarias,
        slots,
        modoAlocacao: modo,
        status: 'MONTANDO' as const,
    };

    if (modo === 'IMPOSITIVA') {
        const resultados = await executarAlocacaoImpositiva(equipe, cuidadores);
        return ok({
            modo: 'IMPOSITIVA',
            alocacoes: resultados,
            pendenteFeedback: resultados.filter((r: { status: string }) => r.status === 'PENDENTE_FEEDBACK').length,
        });
    } else {
        const slotsDisponiveis = inicializarSlotsParaEscolha(equipe);
        return ok({
            modo: 'ESCOLHA',
            slots: slotsDisponiveis,
        });
    }
});
