import { NextRequest, NextResponse } from 'next/server';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { ok, fail, E } from '@/lib/api/response';
import { exportPacienteData } from '@/lib/lgpd/data-export.service';

async function handleGet(
    _request: NextRequest,
    { params }: { params: Promise<{ pacienteId: string }> }
) {
    const guard = await guardCapability('MANAGE_PACIENTES');
    if (guard instanceof NextResponse) return guard;

    const { pacienteId } = await params;
    const data = await exportPacienteData(pacienteId);

    if (!data) {
        return fail(E.NOT_FOUND, 'Paciente não encontrado', { status: 404 });
    }

    return ok(data);
}

export const GET = withErrorBoundary(handleGet);
