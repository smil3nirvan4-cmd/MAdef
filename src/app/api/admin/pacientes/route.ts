import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status');
        const tipo = searchParams.get('tipo');

        const where: any = {};

        if (search) {
            where.OR = [
                { nome: { contains: search } },
                { telefone: { contains: search } },
                { cidade: { contains: search } },
            ];
        }

        if (status && status !== 'ALL') {
            where.status = status;
        }

        if (tipo && tipo !== 'ALL') {
            where.tipo = tipo;
        }

        const pacientes = await prisma.paciente.findMany({
            where,
            include: {
                _count: {
                    select: {
                        avaliacoes: true,
                        orcamentos: true,
                        alocacoes: true,
                        mensagens: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 200
        });

        // Stats
        const stats = {
            total: await prisma.paciente.count(),
            ativos: await prisma.paciente.count({ where: { status: 'ATIVO' } }),
            leads: await prisma.paciente.count({ where: { status: 'LEAD' } }),
            avaliacao: await prisma.paciente.count({ where: { status: 'AVALIACAO' } }),
        };

        return NextResponse.json({ pacientes, stats });
    } catch (error) {
        console.error('Error fetching pacientes:', error);
        return NextResponse.json({ error: 'Erro ao buscar pacientes' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { nome, telefone, cidade, bairro, tipo, hospital, quarto, prioridade } = body;

        if (!telefone) {
            return NextResponse.json({ error: 'Telefone é obrigatório' }, { status: 400 });
        }

        // Check if already exists
        const existing = await prisma.paciente.findUnique({ where: { telefone } });
        if (existing) {
            return NextResponse.json({ error: 'Paciente já cadastrado com este telefone' }, { status: 400 });
        }

        const paciente = await prisma.paciente.create({
            data: {
                nome,
                telefone,
                cidade,
                bairro,
                tipo: tipo || 'HOME_CARE',
                hospital,
                quarto,
                prioridade: prioridade || 'NORMAL',
                status: 'LEAD',
            }
        });

        return NextResponse.json({ success: true, paciente });
    } catch (error) {
        console.error('Error creating paciente:', error);
        return NextResponse.json({ error: 'Erro ao criar paciente' }, { status: 500 });
    }
}
