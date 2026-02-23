import { NextRequest, NextResponse } from 'next/server';
import { getQueueStatus } from '@/lib/whatsapp/queue';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/whatsapp/queue
 * Retorna o status da fila de mensagens
 */
async function handleGet(request: NextRequest) {
    const guard = await guardCapability('VIEW_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const status = getQueueStatus();
    return NextResponse.json({
        success: true,
        queue: status
    });
}

export const GET = withRateLimit(withErrorBoundary(handleGet), { max: 30, windowMs: 60_000 });
