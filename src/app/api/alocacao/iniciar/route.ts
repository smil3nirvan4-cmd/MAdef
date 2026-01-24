import { NextRequest, NextResponse } from 'next/server';
import { gerarSlots24h } from '@/lib/allocation/slots';
import { executarAlocacaoImpositiva } from '@/lib/allocation/impositiva';
import { inicializarSlotsParaEscolha } from '@/lib/allocation/escolha';

export async function POST(request: NextRequest) {
    try {
        // Note: This endpoint expects a body structure that matches what we're destructing.
        // In a real app, use Zod to validate this body too.
        const { equipeId, pacienteId, modo, horasDiarias, duracaoDias, cuidadores } = await request.json();

        // Gerar slots
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
            return NextResponse.json({
                success: true,
                modo: 'IMPOSITIVA',
                alocacoes: resultados,
                pendenteFeedback: resultados.filter(r => r.status === 'PENDENTE_FEEDBACK').length,
            });
        } else {
            const slotsDisponiveis = inicializarSlotsParaEscolha(equipe);
            return NextResponse.json({
                success: true,
                modo: 'ESCOLHA',
                slots: slotsDisponiveis,
            });
        }
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Erro ao iniciar alocação' },
            { status: 500 }
        );
    }
}
