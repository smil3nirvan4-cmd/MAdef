import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { phones, message, template } = body;

        if (!phones || phones.length === 0) {
            return NextResponse.json({ error: 'Nenhum destinatário' }, { status: 400 });
        }

        // Store broadcast messages in queue (will be sent by WhatsApp service)
        const broadcasts = phones.map((phone: string) => ({
            telefone: phone,
            direcao: 'OUT_PENDING',
            conteudo: message || template,
            flow: 'BROADCAST',
            step: 'QUEUE',
        }));

        // This is a placeholder - actual implementation would queue messages
        // For now, log the broadcast request
        await prisma.systemLog.create({
            data: {
                type: 'INFO',
                action: 'broadcast_scheduled',
                message: `Broadcast agendado para ${phones.length} destinatários`,
                metadata: JSON.stringify({ phones, message: message?.substring(0, 100) }),
            }
        });

        return NextResponse.json({
            success: true,
            count: phones.length,
            message: `Broadcast agendado para ${phones.length} destinatários`
        });
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao agendar broadcast' }, { status: 500 });
    }
}
