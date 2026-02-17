import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const DEFAULT_LABELS = [
    { name: 'VIP', color: '#FFD700' },
    { name: 'Novo', color: '#4CAF50' },
    { name: 'Aguardando', color: '#FF9800' },
];

async function ensureSeed() {
    const total = await prisma.whatsAppLabel.count();
    if (total > 0) return;
    await prisma.whatsAppLabel.createMany({
        data: DEFAULT_LABELS,
    });
}

function withDescription(label: any) {
    return {
        ...label,
        description: '',
    };
}

export async function GET(_request: NextRequest) {
    try {
        await ensureSeed();
        const labels = await prisma.whatsAppLabel.findMany({ orderBy: { name: 'asc' } });
        return NextResponse.json({ success: true, labels: labels.map(withDescription) });
    } catch (error) {
        console.error('[API] labels GET erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao listar labels' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, color } = body || {};

        if (!name) {
            return NextResponse.json({ success: false, error: 'name é obrigatório' }, { status: 400 });
        }

        const label = await prisma.whatsAppLabel.create({
            data: {
                name: String(name).trim(),
                color: String(color || '#3B82F6'),
            },
        });

        return NextResponse.json({ success: true, label: withDescription(label) });
    } catch (error: any) {
        console.error('[API] labels POST erro:', error);
        const message = String(error?.message || '');
        if (message.includes('Unique constraint')) {
            return NextResponse.json({ success: false, error: 'Etiqueta já existe' }, { status: 409 });
        }
        return NextResponse.json({ success: false, error: 'Erro ao criar etiqueta' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...updates } = body || {};
        if (!id) {
            return NextResponse.json({ success: false, error: 'id é obrigatório' }, { status: 400 });
        }

        const label = await prisma.whatsAppLabel.update({
            where: { id: String(id) },
            data: {
                ...(updates.name !== undefined && { name: String(updates.name).trim() }),
                ...(updates.color !== undefined && { color: String(updates.color) }),
            },
        });

        return NextResponse.json({ success: true, label: withDescription(label) });
    } catch (error) {
        console.error('[API] labels PUT erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao atualizar etiqueta' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ success: false, error: 'id é obrigatório' }, { status: 400 });
        }

        await prisma.whatsAppLabel.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API] labels DELETE erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao excluir etiqueta' }, { status: 500 });
    }
}
