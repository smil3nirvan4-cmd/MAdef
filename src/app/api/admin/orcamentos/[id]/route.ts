import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const orcamento = await prisma.orcamento.findUnique({
            where: { id },
            include: {
                paciente: true
            }
        });

        if (!orcamento) {
            return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 });
        }

        return NextResponse.json({ orcamento });
    } catch (error) {
        console.error('Error fetching orcamento:', error);
        return NextResponse.json({ error: 'Erro ao buscar orçamento' }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { action, cenarioSelecionado, valorFinal, aprovadoPor } = body;

        let updateData: any = {};

        if (action === 'enviar') {
            updateData = {
                status: 'ENVIADO',
                enviadoEm: new Date(),
            };
        } else if (action === 'aceitar') {
            updateData = {
                status: 'ACEITO',
                aceitoEm: new Date(),
            };
        } else if (action === 'aprovar') {
            updateData = {
                cenarioSelecionado,
                valorFinal: valorFinal ? parseFloat(valorFinal) : undefined,
                aprovadoPor,
                status: 'APROVADO',
            };
        } else if (action === 'cancelar') {
            updateData = {
                status: 'CANCELADO',
            };
        } else {
            // Generic update
            updateData = {
                ...(body.cenarioEconomico && { cenarioEconomico: body.cenarioEconomico }),
                ...(body.cenarioRecomendado && { cenarioRecomendado: body.cenarioRecomendado }),
                ...(body.cenarioPremium && { cenarioPremium: body.cenarioPremium }),
                ...(cenarioSelecionado && { cenarioSelecionado }),
                ...(valorFinal && { valorFinal: parseFloat(valorFinal) }),
            };
        }

        const orcamento = await prisma.orcamento.update({
            where: { id },
            data: updateData,
            include: { paciente: true }
        });

        return NextResponse.json({ success: true, orcamento });
    } catch (error) {
        console.error('Error updating orcamento:', error);
        return NextResponse.json({ error: 'Erro ao atualizar orçamento' }, { status: 500 });
    }
}
