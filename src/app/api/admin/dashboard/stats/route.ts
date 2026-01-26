import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

        // Candidatos pendentes (aguardando RH)
        const candidatosPendentes = await prisma.cuidador.count({
            where: {
                status: 'AGUARDANDO_RH'
            }
        });

        // Avaliações criadas hoje
        const avaliacoesHoje = await prisma.avaliacao.count({
            where: {
                createdAt: {
                    gte: today
                }
            }
        });

        // Pacientes ativos
        const pacientesAtivos = await prisma.paciente.count({
            where: {
                status: {
                    in: ['ATIVO', 'AVALIACAO', 'LEAD']
                }
            }
        });

        // Mensagens nas últimas 24h
        const mensagens24h = await prisma.mensagem.count({
            where: {
                timestamp: {
                    gte: yesterday
                }
            }
        });

        // Total de cuidadores aprovados
        const cuidadoresAprovados = await prisma.cuidador.count({
            where: {
                status: 'APROVADO'
            }
        });

        // Avaliações pendentes
        const avaliacoesPendentes = await prisma.avaliacao.count({
            where: {
                status: 'PENDENTE'
            }
        });

        return NextResponse.json({
            candidatosPendentes,
            avaliacoesHoje,
            pacientesAtivos,
            mensagens24h,
            cuidadoresAprovados,
            avaliacoesPendentes,
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return NextResponse.json(
            { error: 'Erro ao carregar estatísticas' },
            { status: 500 }
        );
    }
}
