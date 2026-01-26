import { NextResponse } from 'next/server';
import { getQueueStatus } from '@/lib/whatsapp/queue';

export const dynamic = 'force-dynamic';

/**
 * GET /api/whatsapp/queue
 * Retorna o status da fila de mensagens
 */
export async function GET() {
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
