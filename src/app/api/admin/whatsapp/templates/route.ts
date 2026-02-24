import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { ok, fail, E } from '@/lib/api/response';

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
    const guard = await guardCapability('VIEW_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    await ensureSeed();

    const templates = await prisma.whatsAppTemplate.findMany({
        orderBy: { createdAt: 'desc' },
    });
    const categories = [...new Set(templates.map((t) => t.category))];

    return ok({ templates, categories });
}

async function handlePost(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const body = await request.json();
    const { name, category, content, isActive } = body || {};

    if (!name || !category || !content) {
        return fail(E.VALIDATION_ERROR, 'name, category e content são obrigatórios', { status: 400 });
    }

    try {
        const template = await prisma.whatsAppTemplate.create({
            data: {
                name: String(name).trim(),
                category: String(category).trim(),
                content: String(content),
                isActive: isActive !== false,
            },
        });

        return ok({ template });
    } catch (error: any) {
        const message = String(error?.message || '');
        if (message.includes('Unique constraint')) {
            return fail(E.CONFLICT, 'Já existe template com este nome', { status: 409 });
        }
        throw error;
    }
}

async function handlePut(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const body = await request.json();
    const { id, ...updates } = body || {};

    if (!id) {
        return fail(E.VALIDATION_ERROR, 'id é obrigatório', { status: 400 });
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

    return ok({ template });
}

async function handleDelete(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return fail(E.VALIDATION_ERROR, 'id é obrigatório', { status: 400 });
    }

    await prisma.whatsAppTemplate.delete({ where: { id } });
    return ok({ deleted: true });
}

export const GET = withErrorBoundary(handleGet);
export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 20, windowSec: 60 });
export const PUT = withRateLimit(withErrorBoundary(handlePut), { max: 20, windowSec: 60 });
export const DELETE = withRateLimit(withErrorBoundary(handleDelete), { max: 20, windowSec: 60 });
