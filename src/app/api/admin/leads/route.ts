import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pacienteRepository } from '@/lib/repositories';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';

const LEAD_STATUSES = ['LEAD', 'AVALIACAO', 'PROPOSTA_ENVIADA', 'CONTRATO_ENVIADO'] as const;

async function handleGet(request: NextRequest) {
    const guard = await guardCapability('VIEW_PACIENTES');
    if (guard instanceof NextResponse) return guard;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    const where: any = {
        // Leads = not yet patients (before contract signed)
        status: { in: [...LEAD_STATUSES] }
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

    // findAll does not support multi-status { in: [...] } filter,
    // so prisma.paciente.findMany is kept for the list query
    const leads = await prisma.paciente.findMany({
        where,
        include: {
            _count: { select: { avaliacoes: true, mensagens: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 200
    });

    const [total, leadsCount, avaliacaoCount, propostaCount, contratoCount] = await Promise.all([
        pacienteRepository.count({ status: { in: [...LEAD_STATUSES] } }),
        pacienteRepository.count({ status: 'LEAD' }),
        pacienteRepository.count({ status: 'AVALIACAO' }),
        pacienteRepository.count({ status: 'PROPOSTA_ENVIADA' }),
        pacienteRepository.count({ status: 'CONTRATO_ENVIADO' }),
    ]);

    const stats = {
        total,
        leads: leadsCount,
        avaliacao: avaliacaoCount,
        proposta: propostaCount,
        contrato: contratoCount,
    };

    return NextResponse.json({ leads, stats });
}

export const GET = withRateLimit(withErrorBoundary(handleGet), { max: 30, windowMs: 60_000 });
