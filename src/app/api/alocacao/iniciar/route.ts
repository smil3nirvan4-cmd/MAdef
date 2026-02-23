import { NextRequest, NextResponse } from 'next/server';
import { gerarSlots24h } from '@/lib/allocation/slots';
import { executarAlocacaoImpositiva } from '@/lib/allocation/impositiva';
import { inicializarSlotsParaEscolha } from '@/lib/allocation/escolha';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { ok, fail, E } from '@/lib/api/response';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';
import { parseBody } from '@/lib/api/parse-body';
import { iniciarAlocacaoSchema } from '@/lib/validations/alocacao';

export const POST = withErrorBoundary(async (request: NextRequest) => {
    const guard = await guardCapability('MANAGE_ALOCACOES');
    if (guard instanceof NextResponse) return guard;

    const ip = getClientIp(request);
    const rate = checkRateLimit(`alocacao:${ip}`, 20, 60_000);
    if (!rate.allowed) {
        return fail(E.RATE_LIMITED, 'Rate limit exceeded', { status: 429 });
    }

    const { data, error } = await parseBody(request, iniciarAlocacaoSchema);
    if (error) return error;
    const { equipeId, pacienteId, modo, horasDiarias, duracaoDias, cuidadores } = data;

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
