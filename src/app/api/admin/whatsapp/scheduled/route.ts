import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { enqueueWhatsAppTextJob } from '@/lib/whatsapp/outbox/service';
import logger from '@/lib/observability/logger';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { parseBody } from '@/lib/api/parse-body';

const createScheduledSchema = z.object({
    phone: z.string().min(1),
    message: z.string().min(1),
    scheduledAt: z.string().min(1),
});

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

    return NextResponse.json({
        success: true,
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
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const { data, error } = await parseBody(request, createScheduledSchema);
    if (error) return error;
    const phone = normalizePhone(data.phone);
    const message = data.message;
    const scheduledAt = new Date(data.scheduledAt);

    if (!phone || Number.isNaN(scheduledAt.getTime())) {
        return NextResponse.json({ success: false, error: 'phone, message e scheduledAt sao obrigatorios' }, { status: 400 });
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

    return NextResponse.json({ success: true, scheduled, queue });
}

async function handleDelete(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ success: false, error: 'id e obrigatorio' }, { status: 400 });
    }

    await prisma.whatsAppScheduled.delete({ where: { id } });
    return NextResponse.json({ success: true });
}

export const GET = withRateLimit(withErrorBoundary(handleGet), { max: 30, windowMs: 60_000 });
export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 10, windowMs: 60_000 });
export const DELETE = withRateLimit(withErrorBoundary(handleDelete), { max: 5, windowMs: 60_000 });
