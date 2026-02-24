import { NextRequest, NextResponse } from 'next/server';
import { cuidadorRepository } from '@/lib/repositories/cuidador.repository';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { ok, fail, E } from '@/lib/api/response';
import { z } from 'zod';
import { parseBody, isFailResponse } from '@/lib/api/parse-body';

export const dynamic = 'force-dynamic';

const postSchema = z.object({
    nome: z.string().optional(),
    telefone: z.string().min(1, 'Telefone obrigatório'),
    area: z.string().optional(),
    endereco: z.string().optional(),
    competencias: z.string().optional(),
});

async function handleGet(request: NextRequest) {
    const guard = await guardCapability('VIEW_RH');
    if (guard instanceof NextResponse) return guard;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const area = searchParams.get('area') || undefined;
    const search = searchParams.get('search') || undefined;

    const { cuidadores, stats } = await cuidadorRepository.findAll({ status, area, search });

    return ok({ cuidadores, stats });
}

async function handlePost(request: NextRequest) {
    const guard = await guardCapability('MANAGE_RH');
    if (guard instanceof NextResponse) return guard;

    const body = await parseBody(request, postSchema);
    if (isFailResponse(body)) return body;

    const { nome, telefone, area, endereco, competencias } = body;

    const existing = await cuidadorRepository.findByPhone(telefone);
    if (existing) {
        return fail(E.VALIDATION_ERROR, 'Cuidador já cadastrado');
    }

    const cuidador = await cuidadorRepository.create({ nome, telefone, area, endereco, competencias });

    return ok({ cuidador }, 201);
}

export const GET = withErrorBoundary(handleGet);
export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 20, windowSec: 60 });
