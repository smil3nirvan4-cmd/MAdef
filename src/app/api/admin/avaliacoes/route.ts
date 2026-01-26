import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const avaliacoes = await prisma.avaliacao.findMany({
            include: {
                paciente: {
                    select: {
                        id: true,
                        nome: true,
                        telefone: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ avaliacoes });
    } catch (error) {
        console.error('Erro ao buscar avaliações:', error);
        return NextResponse.json(
            { error: 'Falha ao buscar avaliações', details: String(error) },
            { status: 500 }
        );
    }
}
