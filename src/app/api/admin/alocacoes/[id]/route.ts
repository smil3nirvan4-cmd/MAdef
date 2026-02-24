import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { ok } from '@/lib/api/response';
import { parseBody, isFailResponse } from '@/lib/api/parse-body';
import { z } from 'zod';

const patchSchema = z.object({ action: z.string().optional() }).passthrough();

async function handlePatch(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await guardCapability('MANAGE_ALOCACOES');
    if (guard instanceof NextResponse) return guard;

    const { id } = await params;

    const body = await parseBody(request, patchSchema);
    if (isFailResponse(body)) return body;

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

    return ok({ alocacao });
}

export const PATCH = withRateLimit(withErrorBoundary(handlePatch), { max: 20, windowSec: 60 });
