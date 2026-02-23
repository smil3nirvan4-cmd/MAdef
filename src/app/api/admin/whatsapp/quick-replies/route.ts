import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/observability/logger';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { parseBody } from '@/lib/api/parse-body';

const createQuickReplySchema = z.object({
    shortcut: z.string().min(1),
    content: z.string().min(1),
    isActive: z.boolean().optional(),
});

const updateQuickReplySchema = z.object({
    id: z.string().min(1),
    shortcut: z.string().optional(),
    content: z.string().optional(),
    isActive: z.boolean().optional(),
});

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

async function handleGet(_request: NextRequest) {
    try {
        const guard = await guardCapability('VIEW_WHATSAPP');
        if (guard instanceof NextResponse) return guard;

        await ensureSeed();
        const replies = await prisma.whatsAppQuickReply.findMany({ orderBy: { shortcut: 'asc' } });
        return NextResponse.json({ success: true, replies });
    } catch (error) {
        await logger.error('quick_replies_get_error', 'Erro ao listar respostas rapidas', error instanceof Error ? error : undefined);
        return NextResponse.json({ success: false, error: 'Erro ao listar respostas rápidas' }, { status: 500 });
    }
}

async function handlePost(request: NextRequest) {
    try {
        const guard = await guardCapability('MANAGE_WHATSAPP');
        if (guard instanceof NextResponse) return guard;

        const { data, error } = await parseBody(request, createQuickReplySchema);
        if (error) return error;

        const reply = await prisma.whatsAppQuickReply.create({
            data: {
                shortcut: String(data.shortcut).trim(),
                content: String(data.content),
                isActive: data.isActive !== false,
            },
        });

        return NextResponse.json({ success: true, reply });
    } catch (error: any) {
        await logger.error('quick_replies_post_error', 'Erro ao criar resposta rapida', error instanceof Error ? error : undefined);
        const message = String(error?.message || '');
        if (message.includes('Unique constraint')) {
            return NextResponse.json({ success: false, error: 'Atalho já cadastrado' }, { status: 409 });
        }
        return NextResponse.json({ success: false, error: 'Erro ao criar resposta rápida' }, { status: 500 });
    }
}

async function handlePut(request: NextRequest) {
    try {
        const guard = await guardCapability('MANAGE_WHATSAPP');
        if (guard instanceof NextResponse) return guard;

        const { data, error } = await parseBody(request, updateQuickReplySchema);
        if (error) return error;
        const { id, ...updates } = data;

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
        await logger.error('quick_replies_put_error', 'Erro ao atualizar resposta rapida', error instanceof Error ? error : undefined);
        return NextResponse.json({ success: false, error: 'Erro ao atualizar resposta rápida' }, { status: 500 });
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

        await prisma.whatsAppQuickReply.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        await logger.error('quick_replies_delete_error', 'Erro ao excluir resposta rapida', error instanceof Error ? error : undefined);
        return NextResponse.json({ success: false, error: 'Erro ao excluir resposta rápida' }, { status: 500 });
    }
}

export const GET = withRateLimit(withErrorBoundary(handleGet), { max: 30, windowMs: 60_000 });
export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 10, windowMs: 60_000 });
export const PUT = withRateLimit(withErrorBoundary(handlePut), { max: 10, windowMs: 60_000 });
export const DELETE = withRateLimit(withErrorBoundary(handleDelete), { max: 5, windowMs: 60_000 });
