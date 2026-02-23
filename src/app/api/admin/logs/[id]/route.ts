import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRequestContext } from '@/lib/api/with-request-context';
import { ok } from '@/lib/api/response';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { NotFoundError } from '@/lib/errors';

const getHandler = async (
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const guard = await guardCapability('VIEW_LOGS');
    if (guard instanceof NextResponse) return guard;

    const { id } = await params;
    const log = await prisma.systemLog.findUnique({ where: { id } });
    if (!log) {
        throw new NotFoundError('Log', id);
    }

    return ok({ log });
};

export const GET = withRateLimit(withErrorBoundary(withRequestContext(getHandler)), { max: 30, windowMs: 60_000 });
