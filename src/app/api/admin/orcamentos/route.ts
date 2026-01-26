import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const orcamentos = await prisma.orcamento.findMany({
            include: {
                paciente: {
                    select: {
                        id: true,
                        nome: true,
                        telefone: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        return NextResponse.json({ orcamentos });
    } catch (error) {
        console.error('Error fetching orcamentos:', error);
        return NextResponse.json({ error: 'Erro ao buscar orçamentos' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { pacienteId, cenarioEconomico, cenarioRecomendado, cenarioPremium, valorFinal } = body;

        if (!pacienteId) {
            return NextResponse.json({ error: 'Paciente é obrigatório' }, { status: 400 });
        }

        const orcamento = await prisma.orcamento.create({
            data: {
                pacienteId,
                cenarioEconomico,
                cenarioRecomendado,
                cenarioPremium,
                valorFinal: valorFinal ? parseFloat(valorFinal) : null,
                status: 'RASCUNHO',
            },
            include: {
                paciente: true
            }
        });

        return NextResponse.json({ success: true, orcamento });
    } catch (error) {
        console.error('Error creating orcamento:', error);
        return NextResponse.json({ error: 'Erro ao criar orçamento' }, { status: 500 });
    }
}
