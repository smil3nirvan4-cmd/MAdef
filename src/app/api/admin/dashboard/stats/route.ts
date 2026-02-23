import { NextRequest, NextResponse } from 'next/server';
import { dashboardRepository } from '@/lib/repositories';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';

async function handleGet(_request: NextRequest) {
    const guard = await guardCapability('VIEW_ANALYTICS');
    if (guard instanceof NextResponse) return guard;

    const stats = await dashboardRepository.getStats();

    return NextResponse.json({
        success: true,
        totalLeads: stats.pacientes.ativos,
        leadsNovos: stats.pacientes.novos,
        totalCandidatos: stats.cuidadores.total,
        candidatosAprovados: stats.cuidadores.aprovados,
        totalPacientes: stats.pacientes.total,
        pacientesAtivos: stats.pacientes.ativosLeads,
        totalAvaliacoes: stats.avaliacoes.total,
        avaliacoesPendentes: stats.avaliacoes.pendentes,
        totalOrcamentos: stats.orcamentos.total,
        mensagensHoje: stats.mensagens.hoje,
        mensagensSemana: stats.mensagens.semana,
        conversasAtivas: stats.mensagens.conversasAtivas,
        // Compatibilidade com dashboard já existente
        candidatosPendentes: stats.cuidadores.aguardando,
        avaliacoesHoje: stats.avaliacoes.hoje,
        mensagens24h: stats.mensagens.last24h,
        cuidadoresAprovados: stats.cuidadores.aprovados,
    });
}

export const GET = withRateLimit(withErrorBoundary(handleGet), { max: 30, windowMs: 60_000 });
