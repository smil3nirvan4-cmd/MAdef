import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { E, fail, ok } from '@/lib/api/response';
import { guardCapability } from '@/lib/auth/capability-guard';

async function handleGet(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await guardCapability('VIEW_LOGS');
    if (guard instanceof NextResponse) return guard;

    try {
        const { id } = await params;
        const log = await prisma.systemLog.findUnique({ where: { id } });
        if (!log) {
            return fail(E.NOT_FOUND, 'Log not found', { status: 404 });
        }

        return ok({ log });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load log';
        return fail(E.DATABASE_ERROR, message, { status: 500 });
    }
}

export const GET = withErrorBoundary(handleGet);

