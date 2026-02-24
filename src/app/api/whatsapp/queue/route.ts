import { NextRequest, NextResponse } from 'next/server';
import { getQueueStatus } from '@/lib/whatsapp/queue';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { guardCapability } from '@/lib/auth/capability-guard';

export const dynamic = 'force-dynamic';

async function handleGet(_request: NextRequest) {
    const guard = await guardCapability('VIEW_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    try {
        const status = getQueueStatus();
        return NextResponse.json({
            success: true,
            queue: status
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

export const GET = withErrorBoundary(handleGet);
