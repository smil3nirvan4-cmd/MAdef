import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/observability/logger';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { parseBody } from '@/lib/api/parse-body';

function normalizePhone(phone: string) {
    return String(phone || '').replace(/\D/g, '');
}

async function handleGet(_request: NextRequest) {
    const guard = await guardCapability('VIEW_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const blacklist = await prisma.whatsAppBlacklist.findMany({
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ success: true, blacklist });
}

const addBlacklistSchema = z.object({
    phone: z.string().min(1),
    reason: z.string().optional(),
});

async function handlePost(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const { data, error } = await parseBody(request, addBlacklistSchema);
    if (error) return error;

    const phone = normalizePhone(data.phone);
    const reason = data.reason ? String(data.reason) : null;

    if (!phone) {
        return NextResponse.json({ success: false, error: 'phone é obrigatório' }, { status: 400 });
    }

    const entry = await prisma.whatsAppBlacklist.upsert({
        where: { phone },
        update: { reason },
        create: { phone, reason },
    });

    return NextResponse.json({ success: true, entry });
}

async function handleDelete(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const { searchParams } = new URL(request.url);
    const phone = normalizePhone(searchParams.get('phone') || '');
    const id = searchParams.get('id');

    if (!phone && !id) {
        return NextResponse.json({ success: false, error: 'phone ou id é obrigatório' }, { status: 400 });
    }

    if (id) {
        await prisma.whatsAppBlacklist.delete({ where: { id } });
    } else {
        await prisma.whatsAppBlacklist.delete({ where: { phone } });
    }

    return NextResponse.json({ success: true });
}

export const GET = withRateLimit(withErrorBoundary(handleGet), { max: 30, windowMs: 60_000 });
export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 10, windowMs: 60_000 });
export const DELETE = withRateLimit(withErrorBoundary(handleDelete), { max: 5, windowMs: 60_000 });
