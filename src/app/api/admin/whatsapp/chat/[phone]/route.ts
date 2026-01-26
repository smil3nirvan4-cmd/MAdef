import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ phone: string }> }
) {
    try {
        const { phone } = await params;

        // Get all messages for this phone
        const messages = await prisma.mensagem.findMany({
            where: { telefone: { contains: phone } },
            orderBy: { timestamp: 'asc' },
            take: 500
        });

        // Get cuidador or paciente info
        const cuidador = await prisma.cuidador.findUnique({ where: { telefone: phone } });
        const paciente = await prisma.paciente.findUnique({ where: { telefone: phone } });

        // Get flow state
        const flowState = await prisma.whatsAppFlowState.findFirst({
            where: { phone: { contains: phone } }
        });

        return NextResponse.json({
            contact: {
                phone,
                name: cuidador?.nome || paciente?.nome || phone,
                type: cuidador ? 'cuidador' : paciente ? 'paciente' : 'unknown',
                entity: cuidador || paciente,
                flowState,
            },
            messages,
            stats: {
                totalMessages: messages.length,
                firstMessage: messages[0]?.timestamp,
                lastMessage: messages[messages.length - 1]?.timestamp,
            }
        });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ phone: string }> }
) {
    try {
        const { phone } = await params;
        const body = await request.json();
        const { message } = body;

        if (!message) {
            return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 });
        }

        // Queue message to be sent
        await prisma.mensagem.create({
            data: {
                telefone: phone.includes('@') ? phone : `${phone}@s.whatsapp.net`,
                conteudo: message,
                direcao: 'OUT_PENDING',
                flow: 'MANUAL',
                step: 'ADMIN_SEND',
            }
        });

        // Log the action
        await prisma.systemLog.create({
            data: {
                type: 'INFO',
                action: 'manual_message_queued',
                message: `Mensagem manual para ${phone}`,
                metadata: JSON.stringify({ phone, preview: message.substring(0, 50) }),
            }
        });

        return NextResponse.json({ success: true, message: 'Mensagem agendada para envio' });
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao enviar' }, { status: 500 });
    }
}
