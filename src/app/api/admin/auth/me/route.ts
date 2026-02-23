import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { withRequestContext } from '@/lib/api/with-request-context';
import { E, fail, ok } from '@/lib/api/response';
import { getCapabilities, resolveUserRole } from '@/lib/auth/roles';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';

const getHandler = async (_request: NextRequest) => {
    const session = await auth();
    if (!session?.user?.email) {
        return fail(E.UNAUTHORIZED, 'Authentication required', { status: 401 });
    }

    const role = resolveUserRole(session.user.email);
    return ok({
        userId: String(session.user.email),
        email: String(session.user.email),
        role,
        capabilities: getCapabilities(role),
    });
};

export const GET = withRateLimit(withErrorBoundary(withRequestContext(getHandler)), { max: 30, windowMs: 60_000 });
