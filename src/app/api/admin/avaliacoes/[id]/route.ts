import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const avaliacao = await prisma.avaliacao.findUnique({
            where: { id },
            include: {
                paciente: {
                    include: {
                        mensagens: { orderBy: { timestamp: 'desc' }, take: 50 },
                        orcamentos: { orderBy: { createdAt: 'desc' }, take: 5 },
                    }
                }
            }
        });

        if (!avaliacao) {
            return NextResponse.json({ error: 'Avaliação não encontrada' }, { status: 404 });
        }

        return NextResponse.json({ avaliacao });
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao buscar avaliação' }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { action } = body;

        let updateData: any = {};

        switch (action) {
            case 'enviar_proposta':
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Use POST /api/admin/avaliacoes/[id]/send-proposta para enfileirar envio.',
                    },
                    { status: 400 }
                );
            case 'enviar_contrato':
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Use POST /api/admin/avaliacoes/[id]/send-contrato para enfileirar envio.',
                    },
                    { status: 400 }
                );
            case 'aprovar':
                updateData = { status: 'APROVADA', validadoEm: new Date() };
                break;
            case 'rejeitar':
                updateData = { status: 'REJEITADA', validadoEm: new Date() };
                break;
            case 'concluir':
                updateData = { status: 'CONCLUIDA' };
                break;
            default:
                updateData = body;
        }

        const avaliacao = await prisma.avaliacao.update({
            where: { id },
            data: updateData,
            include: { paciente: true }
        });

        return NextResponse.json({ success: true, avaliacao });
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao atualizar avaliação' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await prisma.avaliacao.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao excluir avaliação' }, { status: 500 });
    }
}
