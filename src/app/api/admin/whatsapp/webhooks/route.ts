import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/observability/logger';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { parseBody } from '@/lib/api/parse-body';

const createWebhookSchema = z.object({
    name: z.string().optional(),
    url: z.string().min(1),
    events: z.array(z.string()).optional(),
    secret: z.string().optional(),
    active: z.boolean().optional(),
});

const updateWebhookSchema = z.object({
    id: z.string().min(1),
    name: z.string().optional(),
    url: z.string().optional(),
    events: z.array(z.string()).optional(),
    secret: z.string().optional().nullable(),
    active: z.boolean().optional(),
});

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
    return NextResponse.json({ success: true, webhooks: webhooks.map(toClientWebhook), events: EVENTS });
}

async function handlePost(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const { data, error } = await parseBody(request, createWebhookSchema);
    if (error) return error;

    const webhook = await prisma.whatsAppWebhook.create({
        data: {
            name: String(data.name || 'Webhook'),
            url: String(data.url),
            events: serializeEvents(data.events || []),
            secret: data.secret ? String(data.secret) : null,
            isActive: data.active !== false,
        },
    });

    return NextResponse.json({ success: true, webhook: toClientWebhook(webhook) });
}

async function handlePut(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const { data, error } = await parseBody(request, updateWebhookSchema);
    if (error) return error;
    const { id, ...updates } = data;

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
}

async function handlePatch(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    return handlePut(request);
}

async function handleDelete(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ success: false, error: 'id é obrigatório' }, { status: 400 });
    }

    await prisma.whatsAppWebhook.delete({ where: { id } });
    return NextResponse.json({ success: true });
}

export const GET = withRateLimit(withErrorBoundary(handleGet), { max: 30, windowMs: 60_000 });
export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 10, windowMs: 60_000 });
export const PUT = withRateLimit(withErrorBoundary(handlePut), { max: 10, windowMs: 60_000 });
export const PATCH = withRateLimit(withErrorBoundary(handlePatch), { max: 10, windowMs: 60_000 });
export const DELETE = withRateLimit(withErrorBoundary(handleDelete), { max: 5, windowMs: 60_000 });
