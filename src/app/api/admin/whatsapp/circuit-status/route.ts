import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { withRequestContext } from '@/lib/api/with-request-context';
import { E, fail, ok } from '@/lib/api/response';
import { whatsappCircuitBreaker } from '@/lib/whatsapp/circuit-breaker';

const getHandler = async (_request: NextRequest) => {
    const session = await auth();
    if (!session?.user) {
        return fail(E.UNAUTHORIZED, 'Authentication required', { status: 401 });
    }

    return ok(whatsappCircuitBreaker.toJSON());
};

export const GET = withRequestContext(getHandler);
