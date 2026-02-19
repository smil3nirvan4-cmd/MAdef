import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { E, fail } from '@/lib/api/response';
import { hasCapability, resolveUserRole, type AdminRole, type Capability } from './roles';

export async function guardCapability(
    capability: Capability
): Promise<{ role: AdminRole; userId: string } | NextResponse> {
    const session = await auth();

    if (!session?.user?.email) {
        return fail(E.UNAUTHORIZED, 'Authentication required', { status: 401 });
    }

    const role = resolveUserRole(session.user.email);
    if (!hasCapability(role, capability)) {
        return fail(E.FORBIDDEN, `Missing capability: ${capability}`, { status: 403 });
    }

    return {
        role,
        userId: String(session.user.email || 'unknown'),
    };
}
