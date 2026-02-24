import { NextRequest, NextResponse } from 'next/server';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { ok } from '@/lib/api/response';
import { whatsappCircuitBreaker } from '@/lib/whatsapp/circuit-breaker';
import { guardCapability } from '@/lib/auth/capability-guard';

async function handleGet(_request: NextRequest) {
    const guard = await guardCapability('VIEW_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    return ok(whatsappCircuitBreaker.toJSON());
}

export const GET = withErrorBoundary(handleGet);
