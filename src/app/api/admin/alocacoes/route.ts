import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/observability/logger';
import { guardCapability } from '@/lib/auth/capability-guard';

export async function GET(request: NextRequest) {
    try {
        const guard = await guardCapability('MANAGE_ALOCACOES');
        if (guard instanceof NextResponse) return guard;

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
        await logger.error('alocacao_fetch_error', 'Error fetching alocacoes', error instanceof Error ? error : undefined);
        return NextResponse.json({ error: 'Erro ao buscar alocações' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const guard = await guardCapability('MANAGE_ALOCACOES');
        if (guard instanceof NextResponse) return guard;

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
        await logger.error('alocacao_create_error', 'Error creating alocacao', error instanceof Error ? error : undefined);
        return NextResponse.json({ error: 'Erro ao criar alocação' }, { status: 500 });
    }
}
