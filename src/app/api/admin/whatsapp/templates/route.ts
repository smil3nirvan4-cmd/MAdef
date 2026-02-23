import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/observability/logger';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { parseBody } from '@/lib/api/parse-body';

const createTemplateSchema = z.object({
    name: z.string().min(1),
    category: z.string().min(1),
    content: z.string().min(1),
    isActive: z.boolean().optional(),
});

const updateTemplateSchema = z.object({
    id: z.string().min(1),
    name: z.string().optional(),
    category: z.string().optional(),
    content: z.string().optional(),
    isActive: z.boolean().optional(),
});

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

async function handleGet(_request: NextRequest) {
    try {
        const guard = await guardCapability('VIEW_WHATSAPP');
        if (guard instanceof NextResponse) return guard;

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

async function handlePost(request: NextRequest) {
    try {
        const guard = await guardCapability('MANAGE_WHATSAPP');
        if (guard instanceof NextResponse) return guard;

        const { data, error } = await parseBody(request, createTemplateSchema);
        if (error) return error;

        const template = await prisma.whatsAppTemplate.create({
            data: {
                name: String(data.name).trim(),
                category: String(data.category).trim(),
                content: String(data.content),
                isActive: data.isActive !== false,
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

async function handlePut(request: NextRequest) {
    try {
        const guard = await guardCapability('MANAGE_WHATSAPP');
        if (guard instanceof NextResponse) return guard;

        const { data, error } = await parseBody(request, updateTemplateSchema);
        if (error) return error;
        const { id, ...updates } = data;

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

async function handleDelete(request: NextRequest) {
    try {
        const guard = await guardCapability('MANAGE_WHATSAPP');
        if (guard instanceof NextResponse) return guard;

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

export const GET = withRateLimit(withErrorBoundary(handleGet), { max: 30, windowMs: 60_000 });
export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 10, windowMs: 60_000 });
export const PUT = withRateLimit(withErrorBoundary(handlePut), { max: 10, windowMs: 60_000 });
export const DELETE = withRateLimit(withErrorBoundary(handleDelete), { max: 5, windowMs: 60_000 });
