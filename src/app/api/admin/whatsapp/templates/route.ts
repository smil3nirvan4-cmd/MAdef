import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/observability/logger';

const DEFAULT_TEMPLATES = [
    { name: 'Boas-vindas Cuidador', category: 'onboarding', content: 'Olá {{nome}}! Bem-vindo à Mãos Amigas.' },
    { name: 'Confirmação Plantão', category: 'escala', content: 'Olá {{nome}}! Você tem plantão em {{data}} às {{hora}}.' },
    { name: 'Lembrete T-24h', category: 'escala', content: 'Lembrete: seu plantão é amanhã, {{data}} às {{hora}}.' },
    { name: 'Proposta Comercial', category: 'comercial', content: 'Olá {{nome}}! Sua proposta está pronta. Valor: {{valor}}.' },
];

async function ensureSeed() {
    const total = await prisma.whatsAppTemplate.count();
    if (total > 0) return;
    await prisma.whatsAppTemplate.createMany({
        data: DEFAULT_TEMPLATES.map((t) => ({ ...t, isActive: true })),
    });
}

export async function GET(_request: NextRequest) {
    try {
        await ensureSeed();

        const templates = await prisma.whatsAppTemplate.findMany({
            orderBy: { createdAt: 'desc' },
        });
        const categories = [...new Set(templates.map((t) => t.category))];

        return NextResponse.json({ success: true, templates, categories });
    } catch (error) {
        await logger.error('templates_get_error', 'Erro ao listar templates', error instanceof Error ? error : undefined);
        return NextResponse.json({ success: false, error: 'Erro ao listar templates' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, category, content, isActive } = body || {};

        if (!name || !category || !content) {
            return NextResponse.json({ success: false, error: 'name, category e content são obrigatórios' }, { status: 400 });
        }

        const template = await prisma.whatsAppTemplate.create({
            data: {
                name: String(name).trim(),
                category: String(category).trim(),
                content: String(content),
                isActive: isActive !== false,
            },
        });

        return NextResponse.json({ success: true, template });
    } catch (error: any) {
        await logger.error('templates_post_error', 'Erro ao criar template', error instanceof Error ? error : undefined);
        const message = String(error?.message || '');
        if (message.includes('Unique constraint')) {
            return NextResponse.json({ success: false, error: 'Já existe template com este nome' }, { status: 409 });
        }
        return NextResponse.json({ success: false, error: 'Erro ao criar template' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...updates } = body || {};

        if (!id) {
            return NextResponse.json({ success: false, error: 'id é obrigatório' }, { status: 400 });
        }

        const template = await prisma.whatsAppTemplate.update({
            where: { id: String(id) },
            data: {
                ...(updates.name !== undefined && { name: String(updates.name).trim() }),
                ...(updates.category !== undefined && { category: String(updates.category).trim() }),
                ...(updates.content !== undefined && { content: String(updates.content) }),
                ...(updates.isActive !== undefined && { isActive: Boolean(updates.isActive) }),
            },
        });

        return NextResponse.json({ success: true, template });
    } catch (error) {
        await logger.error('templates_put_error', 'Erro ao atualizar template', error instanceof Error ? error : undefined);
        return NextResponse.json({ success: false, error: 'Erro ao atualizar template' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'id é obrigatório' }, { status: 400 });
        }

        await prisma.whatsAppTemplate.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        await logger.error('templates_delete_error', 'Erro ao excluir template', error instanceof Error ? error : undefined);
        return NextResponse.json({ success: false, error: 'Erro ao excluir template' }, { status: 500 });
    }
}
