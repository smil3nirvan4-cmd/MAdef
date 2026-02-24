import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { ok, fail, E } from '@/lib/api/response';
import { z } from 'zod';
import { parseBody, isFailResponse } from '@/lib/api/parse-body';

const patchSchema = z.object({
    action: z.string().optional(),
    scoreRH: z.number().optional(),
}).passthrough();

async function handleGet(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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
    if (!cuidador) return fail(E.NOT_FOUND, 'Não encontrado', { status: 404 });
    return ok({ cuidador });
}

async function handlePatch(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await guardCapability('MANAGE_RH');
    if (guard instanceof NextResponse) return guard;

    const { id } = await params;
    const body = await parseBody(request, patchSchema);
    if (isFailResponse(body)) return body;

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
    return ok({ cuidador });
}

async function handleDelete(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await guardCapability('MANAGE_RH');
    if (guard instanceof NextResponse) return guard;

    const { id } = await params;
    await prisma.mensagem.deleteMany({ where: { cuidadorId: id } });
    await prisma.alocacao.deleteMany({ where: { cuidadorId: id } });
    await prisma.cuidador.delete({ where: { id } });
    return ok({ success: true });
}

export const GET = withErrorBoundary(handleGet);
export const PATCH = withRateLimit(withErrorBoundary(handlePatch), { max: 20, windowSec: 60 });
export const DELETE = withRateLimit(withErrorBoundary(handleDelete), { max: 5, windowSec: 60 });
