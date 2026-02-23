import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cuidadorRepository } from '@/lib/repositories';
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
    const guard = await guardCapability('VIEW_RH');
    if (guard instanceof NextResponse) return guard;

    const { id } = await params;
    const cuidador = await cuidadorRepository.findById(id);
    if (!cuidador) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    return NextResponse.json({ cuidador });
}

async function handlePatch(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

    const cuidador = await cuidadorRepository.update(id, updateData);
    return NextResponse.json({ success: true, cuidador });
}

async function handleDelete(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await guardCapability('MANAGE_RH');
    if (guard instanceof NextResponse) return guard;

    const { id } = await params;
    await cuidadorRepository.delete(id);
    return NextResponse.json({ success: true });
}

export const GET = withRateLimit(withErrorBoundary(handleGet), { max: 30, windowMs: 60_000 });
export const PATCH = withRateLimit(withErrorBoundary(handlePatch), { max: 10, windowMs: 60_000 });
export const DELETE = withRateLimit(withErrorBoundary(handleDelete), { max: 5, windowMs: 60_000 });
