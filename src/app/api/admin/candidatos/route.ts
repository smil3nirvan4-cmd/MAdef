import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { guardCapability } from '@/lib/auth/capability-guard';

export const dynamic = 'force-dynamic';

async function handleGet(request: NextRequest) {
    const guard = await guardCapability('VIEW_RH');
    if (guard instanceof NextResponse) return guard;

    try {
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
    } catch (error) {
        console.error('Erro ao buscar candidatos:', error);
        return NextResponse.json({ error: 'Erro ao buscar candidatos' }, { status: 500 });
    }
}

async function handlePost(request: NextRequest) {
    const guard = await guardCapability('MANAGE_RH');
    if (guard instanceof NextResponse) return guard;

    try {
        const body = await request.json();
        const { nome, telefone, area, endereco, competencias } = body;

        if (!telefone) {
            return NextResponse.json({ error: 'Telefone obrigatório' }, { status: 400 });
        }

        const existing = await prisma.cuidador.findUnique({ where: { telefone } });
        if (existing) {
            return NextResponse.json({ error: 'Cuidador já cadastrado' }, { status: 400 });
        }

        const cuidador = await prisma.cuidador.create({
            data: { nome, telefone, area, endereco, competencias, status: 'CRIADO' }
        });

        return NextResponse.json({ success: true, cuidador });
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao criar' }, { status: 500 });
    }
}

export const GET = withErrorBoundary(handleGet);
export const POST = withErrorBoundary(handlePost);
