import { NextRequest, NextResponse } from 'next/server';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { ok, fail, E } from '@/lib/api/response';
import { anonymizePaciente } from '@/lib/lgpd/data-export.service';

async function handlePost(
    _request: NextRequest,
    { params }: { params: Promise<{ pacienteId: string }> }
) {
    const guard = await guardCapability('MANAGE_PACIENTES');
    if (guard instanceof NextResponse) return guard;

    const { pacienteId } = await params;
    const result = await anonymizePaciente(pacienteId);

    if (!result) {
        return fail(E.NOT_FOUND, 'Paciente não encontrado', { status: 404 });
    }

    return ok({ anonymized: true });
}

export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 5, windowSec: 60 });
