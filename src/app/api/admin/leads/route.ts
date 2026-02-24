import { NextRequest, NextResponse } from 'next/server';
import { pacienteRepository } from '@/lib/repositories/paciente.repository';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { ok } from '@/lib/api/response';

async function handleGet(request: NextRequest) {
    const guard = await guardCapability('VIEW_PACIENTES');
    if (guard instanceof NextResponse) return guard;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;

    const { leads, stats } = await pacienteRepository.findLeads({ search, status });

    return ok({ leads, stats });
}

export const GET = withErrorBoundary(handleGet);
