import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { guardCapability } from '@/lib/auth/capability-guard';

const EVENTS = [
    'message_received',
    'message_sent',
    'flow_started',
    'flow_completed',
    'contact_created',
    'status_changed',
];

const DEFAULT_WEBHOOKS = [
    { name: 'CRM Callback', url: '', events: ['message_received', 'message_sent'], secret: '', isActive: false },
];

function serializeEvents(events: unknown): string {
    if (!Array.isArray(events)) return '[]';
    return JSON.stringify(events.map((e) => String(e)));
}

function parseEvents(raw: string | null) {
    if (!raw) return [] as string[];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map((e) => String(e)) : [];
    } catch {
        return [];
    }
}

async function ensureSeed() {
    const total = await prisma.whatsAppWebhook.count();
    if (total > 0) return;

    await prisma.whatsAppWebhook.createMany({
        data: DEFAULT_WEBHOOKS.map((w) => ({
            ...w,
            events: serializeEvents(w.events),
        })),
    });
}

function toClientWebhook(webhook: any) {
    return {
        ...webhook,
        events: parseEvents(webhook.events),
        active: webhook.isActive,
    };
}

async function handleGet(_request: NextRequest) {
    const guard = await guardCapability('VIEW_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    try {
        await ensureSeed();
        const webhooks = await prisma.whatsAppWebhook.findMany({ orderBy: { createdAt: 'desc' } });
        return NextResponse.json({ success: true, webhooks: webhooks.map(toClientWebhook), events: EVENTS });
    } catch (error) {
        console.error('[API] webhooks GET erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao listar webhooks' }, { status: 500 });
    }
}

async function handlePost(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    try {
        const body = await request.json();
        const { name, url, events, secret, active } = body || {};

        if (!url) {
            return NextResponse.json({ success: false, error: 'url é obrigatória' }, { status: 400 });
        }

        const webhook = await prisma.whatsAppWebhook.create({
            data: {
                name: String(name || 'Webhook'),
                url: String(url),
                events: serializeEvents(events || []),
                secret: secret ? String(secret) : null,
                isActive: active !== false,
            },
        });

        return NextResponse.json({ success: true, webhook: toClientWebhook(webhook) });
    } catch (error) {
        console.error('[API] webhooks POST erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao criar webhook' }, { status: 500 });
    }
}

async function handlePut(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    try {
        const body = await request.json();
        const { id, ...updates } = body || {};
        if (!id) {
            return NextResponse.json({ success: false, error: 'id é obrigatório' }, { status: 400 });
        }

        const webhook = await prisma.whatsAppWebhook.update({
            where: { id: String(id) },
            data: {
                ...(updates.name !== undefined && { name: String(updates.name || 'Webhook') }),
                ...(updates.url !== undefined && { url: String(updates.url) }),
                ...(updates.events !== undefined && { events: serializeEvents(updates.events) }),
                ...(updates.secret !== undefined && { secret: updates.secret ? String(updates.secret) : null }),
                ...(updates.active !== undefined && { isActive: Boolean(updates.active) }),
            },
        });

        return NextResponse.json({ success: true, webhook: toClientWebhook(webhook) });
    } catch (error) {
        console.error('[API] webhooks PUT erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao atualizar webhook' }, { status: 500 });
    }
}

async function handlePatch(request: NextRequest) {
    return handlePut(request);
}

async function handleDelete(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ success: false, error: 'id é obrigatório' }, { status: 400 });
        }

        await prisma.whatsAppWebhook.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API] webhooks DELETE erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao excluir webhook' }, { status: 500 });
    }
}

export const GET = withErrorBoundary(handleGet);
export const POST = withErrorBoundary(handlePost);
export const PUT = withErrorBoundary(handlePut);
export const PATCH = withErrorBoundary(handlePatch);
export const DELETE = withErrorBoundary(handleDelete);
