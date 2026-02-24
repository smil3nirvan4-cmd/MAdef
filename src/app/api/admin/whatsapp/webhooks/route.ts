import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { ok, fail, E } from '@/lib/api/response';

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

    await ensureSeed();
    const webhooks = await prisma.whatsAppWebhook.findMany({ orderBy: { createdAt: 'desc' } });
    return ok({ webhooks: webhooks.map(toClientWebhook), events: EVENTS });
}

async function handlePost(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const body = await request.json();
    const { name, url, events, secret, active } = body || {};

    if (!url) {
        return fail(E.VALIDATION_ERROR, 'url é obrigatória', { status: 400 });
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

    return ok({ webhook: toClientWebhook(webhook) });
}

async function handlePut(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const body = await request.json();
    const { id, ...updates } = body || {};
    if (!id) {
        return fail(E.VALIDATION_ERROR, 'id é obrigatório', { status: 400 });
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

    return ok({ webhook: toClientWebhook(webhook) });
}

async function handlePatch(request: NextRequest) {
    return handlePut(request);
}

async function handleDelete(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return fail(E.VALIDATION_ERROR, 'id é obrigatório', { status: 400 });
    }

    await prisma.whatsAppWebhook.delete({ where: { id } });
    return ok({ deleted: true });
}

export const GET = withErrorBoundary(handleGet);
export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 20, windowSec: 60 });
export const PUT = withRateLimit(withErrorBoundary(handlePut), { max: 20, windowSec: 60 });
export const PATCH = withRateLimit(withErrorBoundary(handlePatch), { max: 20, windowSec: 60 });
export const DELETE = withRateLimit(withErrorBoundary(handleDelete), { max: 20, windowSec: 60 });
