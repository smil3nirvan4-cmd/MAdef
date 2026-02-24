import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { ok, fail, E } from '@/lib/api/response';

const DEFAULT_LABELS = [
    { name: 'VIP', color: '#FFD700' },
    { name: 'Novo', color: '#4CAF50' },
    { name: 'Aguardando', color: '#FF9800' },
];

async function ensureSeed() {
    const total = await prisma.whatsAppLabel.count();
    if (total > 0) return;
    await prisma.whatsAppLabel.createMany({
        data: DEFAULT_LABELS,
    });
}

function withDescription(label: any) {
    return {
        ...label,
        description: '',
    };
}

async function handleGet(_request: NextRequest) {
    const guard = await guardCapability('VIEW_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    await ensureSeed();
    const labels = await prisma.whatsAppLabel.findMany({ orderBy: { name: 'asc' } });
    return ok({ labels: labels.map(withDescription) });
}

async function handlePost(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const body = await request.json();
    const { name, color } = body || {};

    if (!name) {
        return fail(E.VALIDATION_ERROR, 'name é obrigatório');
    }

    const label = await prisma.whatsAppLabel.create({
        data: {
            name: String(name).trim(),
            color: String(color || '#3B82F6'),
        },
    });

    return ok({ label: withDescription(label) });
}

async function handlePut(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const body = await request.json();
    const { id, ...updates } = body || {};
    if (!id) {
        return fail(E.VALIDATION_ERROR, 'id é obrigatório');
    }

    const label = await prisma.whatsAppLabel.update({
        where: { id: String(id) },
        data: {
            ...(updates.name !== undefined && { name: String(updates.name).trim() }),
            ...(updates.color !== undefined && { color: String(updates.color) }),
        },
    });

    return ok({ label: withDescription(label) });
}

async function handleDelete(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return fail(E.VALIDATION_ERROR, 'id é obrigatório');
    }

    await prisma.whatsAppLabel.delete({ where: { id } });
    return ok({ deleted: true });
}

export const GET = withErrorBoundary(handleGet);
export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 20, windowSec: 60 });
export const PUT = withRateLimit(withErrorBoundary(handlePut), { max: 20, windowSec: 60 });
export const DELETE = withRateLimit(withErrorBoundary(handleDelete), { max: 20, windowSec: 60 });
