import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/observability/logger';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';

async function handleGet(_request: NextRequest) {
    try {
        const guard = await guardCapability('VIEW_ANALYTICS');
        if (guard instanceof NextResponse) return guard;

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
        const startOf24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const [
            totalLeads,
            leadsNovos,
            totalCandidatos,
            candidatosAprovados,
            candidatosPendentes,
            totalPacientes,
            pacientesAtivos,
            totalAvaliacoes,
            avaliacoesPendentes,
            avaliacoesHoje,
            totalOrcamentos,
            mensagensHoje,
            mensagens24h,
            mensagensSemana,
            conversasAtivasRaw,
        ] = await Promise.all([
            prisma.paciente.count({
                where: {
                    status: { in: ['LEAD', 'AVALIACAO', 'PROPOSTA_ENVIADA', 'CONTRATO_ENVIADO'] },
                },
            }),
            prisma.paciente.count({ where: { createdAt: { gte: startOfWeek } } }),
            prisma.cuidador.count(),
            prisma.cuidador.count({ where: { status: 'APROVADO' } }),
            prisma.cuidador.count({ where: { status: 'AGUARDANDO_RH' } }),
            prisma.paciente.count(),
            prisma.paciente.count({ where: { status: { in: ['ATIVO', 'AVALIACAO', 'LEAD'] } } }),
            prisma.avaliacao.count(),
            prisma.avaliacao.count({ where: { status: 'PENDENTE' } }),
            prisma.avaliacao.count({ where: { createdAt: { gte: startOfToday } } }),
            prisma.orcamento.count(),
            prisma.mensagem.count({ where: { timestamp: { gte: startOfToday } } }),
            prisma.mensagem.count({ where: { timestamp: { gte: startOf24h } } }),
            prisma.mensagem.count({ where: { timestamp: { gte: startOfWeek } } }),
            prisma.mensagem.groupBy({
                by: ['telefone'],
                where: { timestamp: { gte: startOf24h } },
                _count: { _all: true },
            }),
        ]);

        const conversasAtivas = conversasAtivasRaw.length;

        return NextResponse.json({
            success: true,
            totalLeads,
            leadsNovos,
            totalCandidatos,
            candidatosAprovados,
            totalPacientes,
            pacientesAtivos,
            totalAvaliacoes,
            avaliacoesPendentes,
            totalOrcamentos,
            mensagensHoje,
            mensagensSemana,
            conversasAtivas,
            // Compatibilidade com dashboard já existente
            candidatosPendentes,
            avaliacoesHoje,
            mensagens24h,
            cuidadoresAprovados: candidatosAprovados,
        });
    } catch (error) {
        await logger.error('dashboard_stats_error', 'Error fetching dashboard stats', error instanceof Error ? error : undefined);
        return NextResponse.json({ success: false, error: 'Erro ao carregar estatísticas' }, { status: 500 });
    }
}

export const GET = withRateLimit(withErrorBoundary(handleGet), { max: 30, windowMs: 60_000 });
