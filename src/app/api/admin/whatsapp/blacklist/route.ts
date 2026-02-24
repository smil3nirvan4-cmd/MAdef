import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { guardCapability } from '@/lib/auth/capability-guard';

function normalizePhone(phone: string) {
    return String(phone || '').replace(/\D/g, '');
}

async function handleGet(_request: NextRequest) {
    const guard = await guardCapability('VIEW_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    try {
        const blacklist = await prisma.whatsAppBlacklist.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json({ success: true, blacklist });
    } catch (error) {
        console.error('[API] blacklist GET erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao listar blacklist' }, { status: 500 });
    }
}

async function handlePost(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    try {
        const body = await request.json();
        const phone = normalizePhone(body?.phone);
        const reason = body?.reason ? String(body.reason) : null;

        if (!phone) {
            return NextResponse.json({ success: false, error: 'phone é obrigatório' }, { status: 400 });
        }

        const entry = await prisma.whatsAppBlacklist.upsert({
            where: { phone },
            update: { reason },
            create: { phone, reason },
        });

        return NextResponse.json({ success: true, entry });
    } catch (error) {
        console.error('[API] blacklist POST erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao adicionar blacklist' }, { status: 500 });
    }
}

async function handleDelete(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    try {
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
    } catch (error) {
        console.error('[API] blacklist DELETE erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao remover da blacklist' }, { status: 500 });
    }
}

export const GET = withErrorBoundary(handleGet);
export const POST = withErrorBoundary(handlePost);
export const DELETE = withErrorBoundary(handleDelete);
