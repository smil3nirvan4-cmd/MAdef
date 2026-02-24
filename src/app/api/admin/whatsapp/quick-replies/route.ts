import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { ok, fail, E } from '@/lib/api/response';

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
    const guard = await guardCapability('VIEW_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    await ensureSeed();
    const replies = await prisma.whatsAppQuickReply.findMany({ orderBy: { shortcut: 'asc' } });
    return ok({ replies });
}

async function handlePost(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const body = await request.json();
    const { shortcut, content, isActive } = body || {};

    if (!shortcut || !content) {
        return fail(E.VALIDATION_ERROR, 'shortcut e content são obrigatórios', { status: 400 });
    }

    try {
        const reply = await prisma.whatsAppQuickReply.create({
            data: {
                shortcut: String(shortcut).trim(),
                content: String(content),
                isActive: isActive !== false,
            },
        });

        return ok({ reply });
    } catch (error: any) {
        const message = String(error?.message || '');
        if (message.includes('Unique constraint')) {
            return fail(E.CONFLICT, 'Atalho já cadastrado', { status: 409 });
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

    const reply = await prisma.whatsAppQuickReply.update({
        where: { id: String(id) },
        data: {
            ...(updates.shortcut !== undefined && { shortcut: String(updates.shortcut).trim() }),
            ...(updates.content !== undefined && { content: String(updates.content) }),
            ...(updates.isActive !== undefined && { isActive: Boolean(updates.isActive) }),
        },
    });

    return ok({ reply });
}

async function handleDelete(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return fail(E.VALIDATION_ERROR, 'id é obrigatório', { status: 400 });
    }

    await prisma.whatsAppQuickReply.delete({ where: { id } });
    return ok({ deleted: true });
}

export const GET = withErrorBoundary(handleGet);
export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 20, windowSec: 60 });
export const PUT = withRateLimit(withErrorBoundary(handlePut), { max: 20, windowSec: 60 });
export const DELETE = withRateLimit(withErrorBoundary(handleDelete), { max: 20, windowSec: 60 });
