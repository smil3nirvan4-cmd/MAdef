import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const paciente = await prisma.paciente.findUnique({
            where: { id },
            include: {
                avaliacoes: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                },
                orcamentos: {
                    orderBy: { createdAt: 'desc' },
                    take: 10
                },
                alocacoes: {
                    include: { cuidador: true },
                    orderBy: { createdAt: 'desc' },
                    take: 10
                },
                mensagens: {
                    orderBy: { timestamp: 'desc' },
                    take: 50
                }
            }
        });

        if (!paciente) {
            return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });
        }

        return NextResponse.json({ paciente });
    } catch (error) {
        console.error('Error fetching paciente:', error);
        return NextResponse.json({ error: 'Erro ao buscar paciente' }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const paciente = await prisma.paciente.update({
            where: { id },
            data: {
                ...(body.nome && { nome: body.nome }),
                ...(body.cidade && { cidade: body.cidade }),
                ...(body.bairro && { bairro: body.bairro }),
                ...(body.tipo && { tipo: body.tipo }),
                ...(body.hospital && { hospital: body.hospital }),
                ...(body.quarto && { quarto: body.quarto }),
                ...(body.status && { status: body.status }),
                ...(body.prioridade && { prioridade: body.prioridade }),
            }
        });

        return NextResponse.json({ success: true, paciente });
    } catch (error) {
        console.error('Error updating paciente:', error);
        return NextResponse.json({ error: 'Erro ao atualizar paciente' }, { status: 500 });
    }
}
