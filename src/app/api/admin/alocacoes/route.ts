import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { guardCapability } from '@/lib/auth/capability-guard';

async function handleGet(request: NextRequest) {
    const guard = await guardCapability('MANAGE_ALOCACOES');
    if (guard instanceof NextResponse) return guard;

    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const cuidadorId = searchParams.get('cuidadorId');
        const pacienteId = searchParams.get('pacienteId');

        const where: any = {};

        if (status && status !== 'ALL') {
            where.status = status;
        }
        if (cuidadorId) {
            where.cuidadorId = cuidadorId;
        }
        if (pacienteId) {
            where.pacienteId = pacienteId;
        }

        const alocacoes = await prisma.alocacao.findMany({
            where,
            include: {
                cuidador: {
                    select: {
                        id: true,
                        nome: true,
                        telefone: true,
                        area: true,
                    }
                },
                paciente: {
                    select: {
                        id: true,
                        nome: true,
                        telefone: true,
                        hospital: true,
                        quarto: true,
                    }
                }
            },
            orderBy: { dataInicio: 'desc' },
            take: 200
        });

        // Stats
        const stats = {
            total: await prisma.alocacao.count(),
            pendentes: await prisma.alocacao.count({ where: { status: 'PENDENTE_FEEDBACK' } }),
            confirmadas: await prisma.alocacao.count({ where: { status: 'CONFIRMADO' } }),
            emAndamento: await prisma.alocacao.count({ where: { status: 'EM_ANDAMENTO' } }),
            concluidas: await prisma.alocacao.count({ where: { status: 'CONCLUIDO' } }),
        };

        return NextResponse.json({ alocacoes, stats });
    } catch (error) {
        console.error('Error fetching alocacoes:', error);
        return NextResponse.json({ error: 'Erro ao buscar alocações' }, { status: 500 });
    }
}

async function handlePost(request: NextRequest) {
    const guard = await guardCapability('MANAGE_ALOCACOES');
    if (guard instanceof NextResponse) return guard;

    try {
        const body = await request.json();
        const { cuidadorId, pacienteId, slotId, turno, diaSemana, dataInicio, hospital, quarto } = body;

        if (!cuidadorId || !slotId) {
            return NextResponse.json({ error: 'Cuidador e slot são obrigatórios' }, { status: 400 });
        }

        const alocacao = await prisma.alocacao.create({
            data: {
                cuidadorId,
                pacienteId,
                slotId,
                turno: turno || 'DIURNO',
                diaSemana: diaSemana || 0,
                dataInicio: dataInicio ? new Date(dataInicio) : new Date(),
                hospital,
                quarto,
                status: 'PENDENTE_FEEDBACK',
            },
            include: {
                cuidador: true,
                paciente: true,
            }
        });

        return NextResponse.json({ success: true, alocacao });
    } catch (error) {
        console.error('Error creating alocacao:', error);
        return NextResponse.json({ error: 'Erro ao criar alocação' }, { status: 500 });
    }
}

export const GET = withErrorBoundary(handleGet);
export const POST = withErrorBoundary(handlePost);
