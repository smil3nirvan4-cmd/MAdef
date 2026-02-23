import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardCapability } from '@/lib/auth/capability-guard';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const guard = await guardCapability('VIEW_RH');
        if (guard instanceof NextResponse) return guard;

        const { id } = await params;
        const cuidador = await prisma.cuidador.findUnique({
            where: { id },
            include: {
                mensagens: { orderBy: { timestamp: 'desc' }, take: 50 },
                alocacoes: { include: { paciente: true }, orderBy: { createdAt: 'desc' }, take: 20 }
            }
        });
        if (!cuidador) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
        return NextResponse.json({ cuidador });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const guard = await guardCapability('MANAGE_RH');
        if (guard instanceof NextResponse) return guard;

        const { id } = await params;
        const body = await request.json();
        const { action, scoreRH, ...updateFields } = body;

        let updateData: any = {};

        switch (action) {
            case 'aprovar':
                updateData = { status: 'APROVADO', scoreRH: scoreRH || undefined };
                break;
            case 'rejeitar':
                updateData = { status: 'REJEITADO' };
                break;
            case 'entrevistar':
                updateData = { status: 'EM_ENTREVISTA' };
                break;
            case 'reativar':
                updateData = { status: 'AGUARDANDO_RH' };
                break;
            default:
                updateData = updateFields;
        }

        const cuidador = await prisma.cuidador.update({ where: { id }, data: updateData });
        return NextResponse.json({ success: true, cuidador });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const guard = await guardCapability('MANAGE_RH');
        if (guard instanceof NextResponse) return guard;

        const { id } = await params;
        await prisma.mensagem.deleteMany({ where: { cuidadorId: id } });
        await prisma.alocacao.deleteMany({ where: { cuidadorId: id } });
        await prisma.cuidador.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 });
    }
}
