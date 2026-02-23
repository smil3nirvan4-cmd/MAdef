import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { guardCapability } from '@/lib/auth/capability-guard';
import { parseBody } from '@/lib/api/parse-body';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';

const patchCandidatoSchema = z.object({
    action: z.string().optional(),
    scoreRH: z.number().optional(),
}).passthrough();

async function handleGet(
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

async function handlePatch(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const guard = await guardCapability('MANAGE_RH');
        if (guard instanceof NextResponse) return guard;

        const { id } = await params;
        const { data, error } = await parseBody(request, patchCandidatoSchema);
        if (error) return error;
        const { action, scoreRH, ...updateFields } = data;

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

async function handleDelete(
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

export const GET = withRateLimit(withErrorBoundary(handleGet), { max: 30, windowMs: 60_000 });
export const PATCH = withRateLimit(withErrorBoundary(handlePatch), { max: 10, windowMs: 60_000 });
export const DELETE = withRateLimit(withErrorBoundary(handleDelete), { max: 5, windowMs: 60_000 });
