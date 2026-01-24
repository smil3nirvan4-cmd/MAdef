import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/lib/whatsapp/handlers';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Processar mensagem do webhook
        await handleIncomingMessage(body);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro no webhook WhatsApp:', error);
        return NextResponse.json(
            { success: false, error: 'Erro ao processar mensagem' },
            { status: 500 }
        );
    }
}

// Health check
export async function GET() {
    return NextResponse.json({ status: 'ok', service: 'whatsapp-webhook' });
}
