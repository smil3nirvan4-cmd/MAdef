import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/observability/logger';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const status = searchParams.get('status');

        const where: any = {
            // Leads = not yet patients (before contract signed)
            status: { in: ['LEAD', 'AVALIACAO', 'PROPOSTA_ENVIADA', 'CONTRATO_ENVIADO'] }
        };

        if (status && status !== 'ALL') {
            where.status = status;
        }

        if (search) {
            where.OR = [
                { nome: { contains: search } },
                { telefone: { contains: search } },
            ];
        }

        const leads = await prisma.paciente.findMany({
            where,
            include: {
                _count: { select: { avaliacoes: true, mensagens: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 200
        });

        const stats = {
            total: await prisma.paciente.count({ where: { status: { in: ['LEAD', 'AVALIACAO', 'PROPOSTA_ENVIADA', 'CONTRATO_ENVIADO'] } } }),
            leads: await prisma.paciente.count({ where: { status: 'LEAD' } }),
            avaliacao: await prisma.paciente.count({ where: { status: 'AVALIACAO' } }),
            proposta: await prisma.paciente.count({ where: { status: 'PROPOSTA_ENVIADA' } }),
            contrato: await prisma.paciente.count({ where: { status: 'CONTRATO_ENVIADO' } }),
        };

        return NextResponse.json({ leads, stats });
    } catch (error) {
        await logger.error('lead_fetch_error', 'Error fetching leads', error instanceof Error ? error : undefined);
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}
