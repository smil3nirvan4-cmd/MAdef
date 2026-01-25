import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { action, scoreRH } = body;

        if (!action || !['aprovar', 'rejeitar', 'entrevistar'].includes(action)) {
            return NextResponse.json(
                { error: 'Ação inválida. Use: aprovar, rejeitar ou entrevistar' },
                { status: 400 }
            );
        }

        const cuidador = await prisma.cuidador.findUnique({
            where: { id }
        });

        if (!cuidador) {
            return NextResponse.json(
                { error: 'Cuidador não encontrado' },
                { status: 404 }
            );
        }

        let updateData: Record<string, unknown> = {};

        switch (action) {
            case 'aprovar':
                updateData = {
                    status: 'APROVADO',
                    scoreRH: scoreRH || cuidador.scoreRH
                };
                break;
            case 'rejeitar':
                updateData = {
                    status: 'REJEITADO'
                };
                break;
            case 'entrevistar':
                updateData = {
                    status: 'EM_ENTREVISTA'
                };
                break;
        }

        const updatedCuidador = await prisma.cuidador.update({
            where: { id },
            data: updateData
        });

        return NextResponse.json({
            success: true,
            cuidador: updatedCuidador,
            message: `Cuidador ${action === 'aprovar' ? 'aprovado' : action === 'rejeitar' ? 'rejeitado' : 'marcado para entrevista'} com sucesso`
        });
    } catch (error) {
        console.error('Erro ao atualizar candidato:', error);
        return NextResponse.json(
            { error: 'Erro ao processar ação' },
            { status: 500 }
        );
    }
}
