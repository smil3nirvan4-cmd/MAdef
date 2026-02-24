import { NextRequest, NextResponse } from 'next/server';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withRequestContext } from '@/lib/api/with-request-context';
import { ok } from '@/lib/api/response';
import { whatsappCircuitBreaker } from '@/lib/whatsapp/circuit-breaker';

const getHandler = async (_request: NextRequest) => {
    const guard = await guardCapability('VIEW_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    return ok(whatsappCircuitBreaker.toJSON());
};

export const GET = withRequestContext(getHandler);
