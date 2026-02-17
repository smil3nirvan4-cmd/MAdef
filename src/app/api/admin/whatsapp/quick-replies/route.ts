import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEFAULT_REPLIES = [
    { shortcut: '/oi', content: 'Olá! Como posso ajudar você hoje?' },
    { shortcut: '/menu', content: 'Digite:\n1️⃣ Sou CUIDADOR\n2️⃣ Preciso de um cuidador\n3️⃣ Falar com atendente' },
    { shortcut: '/aguarde', content: 'Por favor, aguarde um momento. Em breve retornaremos.' },
];

async function ensureSeed() {
    const total = await prisma.whatsAppQuickReply.count();
    if (total > 0) return;
    await prisma.whatsAppQuickReply.createMany({
        data: DEFAULT_REPLIES.map((r) => ({ ...r, isActive: true })),
    });
}

export async function GET(_request: NextRequest) {
    try {
        await ensureSeed();
        const replies = await prisma.whatsAppQuickReply.findMany({ orderBy: { shortcut: 'asc' } });
        return NextResponse.json({ success: true, replies });
    } catch (error) {
        console.error('[API] quick-replies GET erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao listar respostas rápidas' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { shortcut, content, isActive } = body || {};

        if (!shortcut || !content) {
            return NextResponse.json({ success: false, error: 'shortcut e content são obrigatórios' }, { status: 400 });
        }

        const reply = await prisma.whatsAppQuickReply.create({
            data: {
                shortcut: String(shortcut).trim(),
                content: String(content),
                isActive: isActive !== false,
            },
        });

        return NextResponse.json({ success: true, reply });
    } catch (error: any) {
        console.error('[API] quick-replies POST erro:', error);
        const message = String(error?.message || '');
        if (message.includes('Unique constraint')) {
            return NextResponse.json({ success: false, error: 'Atalho já cadastrado' }, { status: 409 });
        }
        return NextResponse.json({ success: false, error: 'Erro ao criar resposta rápida' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...updates } = body || {};

        if (!id) {
            return NextResponse.json({ success: false, error: 'id é obrigatório' }, { status: 400 });
        }

        const reply = await prisma.whatsAppQuickReply.update({
            where: { id: String(id) },
            data: {
                ...(updates.shortcut !== undefined && { shortcut: String(updates.shortcut).trim() }),
                ...(updates.content !== undefined && { content: String(updates.content) }),
                ...(updates.isActive !== undefined && { isActive: Boolean(updates.isActive) }),
            },
        });

        return NextResponse.json({ success: true, reply });
    } catch (error) {
        console.error('[API] quick-replies PUT erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao atualizar resposta rápida' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ success: false, error: 'id é obrigatório' }, { status: 400 });
        }

        await prisma.whatsAppQuickReply.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API] quick-replies DELETE erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao excluir resposta rápida' }, { status: 500 });
    }
}
