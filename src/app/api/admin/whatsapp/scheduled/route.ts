import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Scheduled Messages Table (create if not exists via Prisma)
// For now, use SystemLog as storage

export async function GET() {
    try {
        const scheduled = await prisma.systemLog.findMany({
            where: { type: 'SCHEDULED_MESSAGE', action: 'pending' },
            orderBy: { createdAt: 'asc' },
            take: 100
        });

        const messages = scheduled.map(s => {
            const meta = JSON.parse(s.metadata || '{}');
            return {
                id: s.id,
                phone: meta.phone,
                message: meta.message,
                scheduledAt: meta.scheduledAt,
                createdAt: s.createdAt,
            };
        });

        return NextResponse.json({ scheduled: messages });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { phone, message, scheduledAt } = body;

        if (!phone || !message || !scheduledAt) {
            return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
        }

        await prisma.systemLog.create({
            data: {
                type: 'SCHEDULED_MESSAGE',
                action: 'pending',
                message: `Agendado para ${phone}`,
                metadata: JSON.stringify({ phone, message, scheduledAt }),
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (id) {
            await prisma.systemLog.delete({ where: { id } });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}
