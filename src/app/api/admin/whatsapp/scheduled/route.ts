import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { enqueueWhatsAppTextJob } from '@/lib/whatsapp/outbox/service';

function normalizePhone(raw: string) {
    return String(raw || '').replace(/\D/g, '');
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'pending';

        const scheduled = await prisma.whatsAppScheduled.findMany({
            where: status ? { status } : undefined,
            orderBy: { scheduledAt: 'asc' },
            take: 200,
        });

        return NextResponse.json({
            success: true,
            scheduled: scheduled.map((item) => ({
                id: item.id,
                phone: item.to,
                message: item.message,
                scheduledAt: item.scheduledAt,
                status: item.status,
                sentAt: item.sentAt,
                createdAt: item.createdAt,
            })),
        });
    } catch (error) {
        console.error('[API] scheduled GET erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao listar agendamentos' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const phone = normalizePhone(body?.phone);
        const message = body?.message ? String(body.message) : '';
        const scheduledAt = body?.scheduledAt ? new Date(body.scheduledAt) : null;

        if (!phone || !message || !scheduledAt || Number.isNaN(scheduledAt.getTime())) {
            return NextResponse.json({ success: false, error: 'phone, message e scheduledAt sao obrigatorios' }, { status: 400 });
        }

        const scheduled = await prisma.whatsAppScheduled.create({
            data: {
                to: phone,
                message,
                scheduledAt,
                status: 'pending',
            },
        });

        const queue = await enqueueWhatsAppTextJob({
            phone,
            text: message,
            scheduledAt,
            context: {
                source: 'admin_scheduled',
                scheduledId: scheduled.id,
            },
            metadata: {
                type: 'SCHEDULED',
                scheduledId: scheduled.id,
            },
        });

        return NextResponse.json({ success: true, scheduled, queue });
    } catch (error) {
        console.error('[API] scheduled POST erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao agendar mensagem' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ success: false, error: 'id e obrigatorio' }, { status: 400 });
        }

        await prisma.whatsAppScheduled.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API] scheduled DELETE erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao cancelar agendamento' }, { status: 500 });
    }
}
