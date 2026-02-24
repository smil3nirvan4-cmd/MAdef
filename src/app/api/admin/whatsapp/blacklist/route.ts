import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { ok, fail, E } from '@/lib/api/response';

function normalizePhone(phone: string) {
    return String(phone || '').replace(/\D/g, '');
}

async function handleGet(_request: NextRequest) {
    const guard = await guardCapability('VIEW_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const blacklist = await prisma.whatsAppBlacklist.findMany({
        orderBy: { createdAt: 'desc' },
    });
    return ok({ blacklist });
}

async function handlePost(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const body = await request.json();
    const phone = normalizePhone(body?.phone);
    const reason = body?.reason ? String(body.reason) : null;

    if (!phone) {
        return fail(E.VALIDATION_ERROR, 'phone é obrigatório');
    }

    const entry = await prisma.whatsAppBlacklist.upsert({
        where: { phone },
        update: { reason },
        create: { phone, reason },
    });

    return ok({ entry });
}

async function handleDelete(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const { searchParams } = new URL(request.url);
    const phone = normalizePhone(searchParams.get('phone') || '');
    const id = searchParams.get('id');

    if (!phone && !id) {
        return fail(E.VALIDATION_ERROR, 'phone ou id é obrigatório');
    }

    if (id) {
        await prisma.whatsAppBlacklist.delete({ where: { id } });
    } else {
        await prisma.whatsAppBlacklist.delete({ where: { phone } });
    }

    return ok({ deleted: true });
}

export const GET = withErrorBoundary(handleGet);
export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 20, windowSec: 60 });
export const DELETE = withRateLimit(withErrorBoundary(handleDelete), { max: 20, windowSec: 60 });
