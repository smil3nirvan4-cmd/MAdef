import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
            case 'confirmar':
                updateData = { status: 'CONFIRMADO', respondidoEm: new Date() };
                break;
            case 'confirmar_t24':
                updateData = { confirmadoT24: new Date() };
                break;
            case 'confirmar_t2':
                updateData = { confirmadoT2: new Date(), status: 'EM_ANDAMENTO' };
                break;
            case 'concluir':
                updateData = { status: 'CONCLUIDO' };
                break;
            case 'cancelar':
                updateData = { status: 'CANCELADO' };
                break;
            default:
                updateData = body;
        }

        const alocacao = await prisma.alocacao.update({
            where: { id },
            data: updateData,
            include: { cuidador: true, paciente: true }
        });

        return NextResponse.json({ success: true, alocacao });
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });
    }
}
