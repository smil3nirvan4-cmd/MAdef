import { prisma } from '@/lib/prisma';

function startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

function hoursAgo(hours: number): Date {
    return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function startOfWeek(): Date {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

export const dashboardRepository = {
    async getStats() {
        const today = startOfToday();
        const last24h = hoursAgo(24);
        const weekStart = startOfWeek();

        const [
            pacientesAtivos,
            pacientesNovos,
            pacientesTotal,
            pacientesAtivosLeads,
            cuidadoresTotal,
            cuidadoresAprovados,
            cuidadoresAguardando,
            avaliacoesTotal,
            avaliacoesPendentes,
            avaliacoesHoje,
            orcamentosTotal,
            msgHoje,
            msg24h,
            msgSemana,
            conversasAtivas,
        ] = await Promise.all([
            prisma.paciente.count({ where: { status: { in: ['LEAD', 'AVALIACAO', 'PROPOSTA_ENVIADA', 'CONTRATO_ENVIADO'] } } }),
            prisma.paciente.count({ where: { createdAt: { gte: weekStart } } }),
            prisma.paciente.count(),
            prisma.paciente.count({ where: { status: { in: ['ATIVO', 'AVALIACAO', 'LEAD'] } } }),
            prisma.cuidador.count(),
            prisma.cuidador.count({ where: { status: 'APROVADO' } }),
            prisma.cuidador.count({ where: { status: 'AGUARDANDO_RH' } }),
            prisma.avaliacao.count(),
            prisma.avaliacao.count({ where: { status: 'PENDENTE' } }),
            prisma.avaliacao.count({ where: { createdAt: { gte: today } } }),
            prisma.orcamento.count(),
            prisma.mensagem.count({ where: { timestamp: { gte: today } } }),
            prisma.mensagem.count({ where: { timestamp: { gte: last24h } } }),
            prisma.mensagem.count({ where: { timestamp: { gte: weekStart } } }),
            prisma.mensagem.groupBy({
                by: ['telefone'],
                where: { timestamp: { gte: last24h } },
                _count: { _all: true },
            }),
        ]);

        return {
            pacientes: { ativos: pacientesAtivos, novos: pacientesNovos, total: pacientesTotal, ativosLeads: pacientesAtivosLeads },
            cuidadores: { total: cuidadoresTotal, aprovados: cuidadoresAprovados, aguardando: cuidadoresAguardando },
            avaliacoes: { total: avaliacoesTotal, pendentes: avaliacoesPendentes, hoje: avaliacoesHoje },
            orcamentos: { total: orcamentosTotal },
            mensagens: { hoje: msgHoje, last24h: msg24h, semana: msgSemana, conversasAtivas: conversasAtivas.length },
        };
    },
};
