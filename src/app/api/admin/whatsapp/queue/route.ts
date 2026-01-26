import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status'); // pending, sent, failed

        const where: any = { direcao: { startsWith: 'OUT' } };
        if (status === 'pending') where.direcao = 'OUT_PENDING';
        if (status === 'sent') where.direcao = 'OUT';
        if (status === 'failed') where.direcao = 'OUT_FAILED';

        const queue = await prisma.mensagem.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            take: 100
        });

        const stats = {
            pending: await prisma.mensagem.count({ where: { direcao: 'OUT_PENDING' } }),
            sent: await prisma.mensagem.count({ where: { direcao: 'OUT' } }),
            failed: await prisma.mensagem.count({ where: { direcao: 'OUT_FAILED' } }),
        };

        return NextResponse.json({ queue, stats });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, ids } = body;

        if (action === 'retry') {
            await prisma.mensagem.updateMany({
                where: { id: { in: ids }, direcao: 'OUT_FAILED' },
                data: { direcao: 'OUT_PENDING' }
            });
        } else if (action === 'cancel') {
            await prisma.mensagem.deleteMany({
                where: { id: { in: ids }, direcao: 'OUT_PENDING' }
            });
        } else if (action === 'clear_failed') {
            await prisma.mensagem.deleteMany({
                where: { direcao: 'OUT_FAILED' }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}
