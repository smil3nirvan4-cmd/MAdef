import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { ok, fail, E } from '@/lib/api/response';
import { z } from 'zod';
import { parseBody, isFailResponse } from '@/lib/api/parse-body';

export const dynamic = 'force-dynamic';

const postSchema = z.object({
    nome: z.string().optional(),
    telefone: z.string().min(1, 'Telefone obrigatório'),
    area: z.string().optional(),
    endereco: z.string().optional(),
    competencias: z.string().optional(),
});

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

    return ok({ cuidadores, stats });
}

async function handlePost(request: NextRequest) {
    const guard = await guardCapability('MANAGE_RH');
    if (guard instanceof NextResponse) return guard;

    const body = await parseBody(request, postSchema);
    if (isFailResponse(body)) return body;

    const { nome, telefone, area, endereco, competencias } = body;

    const existing = await prisma.cuidador.findUnique({ where: { telefone } });
    if (existing) {
        return fail(E.VALIDATION_ERROR, 'Cuidador já cadastrado');
    }

    const cuidador = await prisma.cuidador.create({
        data: { nome, telefone, area, endereco, competencias, status: 'CRIADO' }
    });

    return ok({ cuidador }, 201);
}

export const GET = withErrorBoundary(handleGet);
export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 20, windowSec: 60 });
