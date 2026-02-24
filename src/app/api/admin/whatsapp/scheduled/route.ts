import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { enqueueWhatsAppTextJob } from '@/lib/whatsapp/outbox/service';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { ok, fail, E } from '@/lib/api/response';

function normalizePhone(raw: string) {
    return String(raw || '').replace(/\D/g, '');
}

async function handleGet(request: NextRequest) {
    const guard = await guardCapability('VIEW_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const scheduled = await prisma.whatsAppScheduled.findMany({
        where: status ? { status } : undefined,
        orderBy: { scheduledAt: 'asc' },
        take: 200,
    });

    return ok({
        scheduled: scheduled.map((item) => ({
            id: item.id,
            phone: item.to,
            message: item.message,
            scheduledAt: item.scheduledAt,
            status: item.status,
            sentAt: item.sentAt,
            createdAt: item.createdAt,
        })),
    });
}

async function handlePost(request: NextRequest) {
    const guard = await guardCapability('SEND_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const body = await request.json();
    const phone = normalizePhone(body?.phone);
    const message = body?.message ? String(body.message) : '';
    const scheduledAt = body?.scheduledAt ? new Date(body.scheduledAt) : null;

    if (!phone || !message || !scheduledAt || Number.isNaN(scheduledAt.getTime())) {
        return fail(E.VALIDATION_ERROR, 'phone, message e scheduledAt sao obrigatorios', { status: 400 });
    }

    const scheduled = await prisma.whatsAppScheduled.create({
        data: {
            to: phone,
            message,
            scheduledAt,
            status: 'pending',
        },
    });

    const queue = await enqueueWhatsAppTextJob({
        phone,
        text: message,
        scheduledAt,
        context: {
            source: 'admin_scheduled',
            scheduledId: scheduled.id,
        },
        metadata: {
            type: 'SCHEDULED',
            scheduledId: scheduled.id,
        },
    });

    return ok({ scheduled, queue });
}

async function handleDelete(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return fail(E.VALIDATION_ERROR, 'id e obrigatorio', { status: 400 });
    }

    await prisma.whatsAppScheduled.delete({ where: { id } });
    return ok({ deleted: true });
}

export const GET = withErrorBoundary(handleGet);
export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 10, windowSec: 60 });
export const DELETE = withRateLimit(withErrorBoundary(handleDelete), { max: 20, windowSec: 60 });
