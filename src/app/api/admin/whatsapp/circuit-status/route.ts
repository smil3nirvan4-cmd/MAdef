import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { withRequestContext } from '@/lib/api/with-request-context';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { E, fail, ok } from '@/lib/api/response';
import { whatsappCircuitBreaker } from '@/lib/whatsapp/circuit-breaker';
import { guardCapability } from '@/lib/auth/capability-guard';

const getHandler = async (_request: NextRequest) => {
    const guard = await guardCapability('VIEW_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    return ok(whatsappCircuitBreaker.toJSON());
};

export const GET = withRateLimit(withErrorBoundary(withRequestContext(getHandler)), { max: 30, windowMs: 60_000 });
