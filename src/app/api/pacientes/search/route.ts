import { NextRequest, NextResponse } from 'next/server';
import { searchPaciente } from '@/lib/database';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { ok, fail, E } from '@/lib/api/response';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';

export const GET = withErrorBoundary(async (request: NextRequest) => {
    const guard = await guardCapability('VIEW_PACIENTES');
    if (guard instanceof NextResponse) return guard;

    const ip = getClientIp(request);
    const rate = checkRateLimit(`pacientes-search:${ip}`, 60, 60_000);
    if (!rate.allowed) {
        return fail(E.RATE_LIMITED, 'Rate limit exceeded', { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return ok([]);
    }

    if (query.length < 3) {
        return fail(E.VALIDATION_ERROR, 'A busca deve ter no mínimo 3 caracteres', { status: 400 });
    }

    const results = await searchPaciente(query);
    return ok(results);
});
