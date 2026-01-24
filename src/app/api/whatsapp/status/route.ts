import { NextResponse } from 'next/server';
import { getWhatsAppSession } from '@/lib/database';

export async function GET() {
    try {
        const session = await getWhatsAppSession();

        if (!session) {
            return NextResponse.json({
                status: 'DISCONNECTED',
                qrCode: null,
                connectedAt: null,
            });
        }

        return NextResponse.json({
            status: session.status,
            qrCode: session.qrCode,
            connectedAt: session.connectedAt?.toISOString() || null,
        });
    } catch (error) {
        console.error('Error getting WhatsApp status:', error);
        return NextResponse.json({
            status: 'DISCONNECTED',
            qrCode: null,
            connectedAt: null,
            error: 'Database not initialized',
        });
    }
}
