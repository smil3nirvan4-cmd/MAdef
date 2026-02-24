import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { E, fail, ok } from '@/lib/api/response';
import { getCapabilities, resolveUserRole } from '@/lib/auth/roles';
import { guardCapability } from '@/lib/auth/capability-guard';

async function handleGet(_request: NextRequest) {
    const guard = await guardCapability('VIEW_PACIENTES');
    if (guard instanceof NextResponse) return guard;

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
}

export const GET = withErrorBoundary(handleGet);
