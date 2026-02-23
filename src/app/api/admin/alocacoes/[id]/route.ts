import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { alocacaoRepository } from '@/lib/repositories';
import { guardCapability } from '@/lib/auth/capability-guard';
import { parseBody } from '@/lib/api/parse-body';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';

const patchAlocacaoSchema = z.object({
    action: z.string().optional(),
}).passthrough();

async function handlePatch(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await guardCapability('MANAGE_ALOCACOES');
    if (guard instanceof NextResponse) return guard;

    const { id } = await params;
    const { data, error } = await parseBody(request, patchAlocacaoSchema);
    if (error) return error;
    const { action } = data;

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
            updateData = data;
    }

    const alocacao = await alocacaoRepository.update(id, updateData);

    return NextResponse.json({ success: true, alocacao });
}

export const PATCH = withRateLimit(withErrorBoundary(handlePatch), { max: 10, windowMs: 60_000 });
