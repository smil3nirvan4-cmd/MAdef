import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/observability/logger';
import { guardCapability } from '@/lib/auth/capability-guard';
import { parseBody } from '@/lib/api/parse-body';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';

const createCandidatoSchema = z.object({
    nome: z.string().optional(),
    telefone: z.string().min(1),
    area: z.string().optional(),
    endereco: z.string().optional(),
    competencias: z.string().optional(),
});

export const dynamic = 'force-dynamic';

async function handleGet(request: NextRequest) {
    const guard = await guardCapability('VIEW_RH');
    if (guard instanceof NextResponse) return guard;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const area = searchParams.get('area');
    const search = searchParams.get('search');

    const where: any = {};

    if (status && status !== 'ALL') {
        where.status = status;
    } else {
        // Default: show pending candidates
        where.status = { in: ['AGUARDANDO_RH', 'EM_ENTREVISTA', 'CRIADO'] };
    }

    if (area && area !== 'ALL') {
        where.area = area;
    }

    if (search) {
        where.OR = [
            { nome: { contains: search } },
            { telefone: { contains: search } },
        ];
    }

    const cuidadores = await prisma.cuidador.findMany({
        where,
        include: {
            _count: {
                select: { mensagens: true, alocacoes: true }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 200
    });

    const stats = {
        total: await prisma.cuidador.count(),
        aguardandoRH: await prisma.cuidador.count({ where: { status: 'AGUARDANDO_RH' } }),
        emEntrevista: await prisma.cuidador.count({ where: { status: 'EM_ENTREVISTA' } }),
        aprovados: await prisma.cuidador.count({ where: { status: 'APROVADO' } }),
        rejeitados: await prisma.cuidador.count({ where: { status: 'REJEITADO' } }),
    };

    return NextResponse.json({ cuidadores, stats });
}

async function handlePost(request: NextRequest) {
    const guard = await guardCapability('MANAGE_RH');
    if (guard instanceof NextResponse) return guard;

    const { data, error } = await parseBody(request, createCandidatoSchema);
    if (error) return error;
    const { nome, telefone, area, endereco, competencias } = data;

    const existing = await prisma.cuidador.findUnique({ where: { telefone } });
    if (existing) {
        return NextResponse.json({ error: 'Cuidador já cadastrado' }, { status: 400 });
    }

    const cuidador = await prisma.cuidador.create({
        data: { nome, telefone, area, endereco, competencias, status: 'CRIADO' }
    });

    return NextResponse.json({ success: true, cuidador });
}

export const GET = withRateLimit(withErrorBoundary(handleGet), { max: 30, windowMs: 60_000 });
export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 10, windowMs: 60_000 });
