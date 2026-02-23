import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/observability/logger';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { parseBody } from '@/lib/api/parse-body';

const createLabelSchema = z.object({
    name: z.string().min(1),
    color: z.string().optional(),
});

const updateLabelSchema = z.object({
    id: z.string().min(1),
    name: z.string().optional(),
    color: z.string().optional(),
});

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
    return NextResponse.json({ success: true, labels: labels.map(withDescription) });
}

async function handlePost(request: NextRequest) {
    try {
        const guard = await guardCapability('MANAGE_WHATSAPP');
        if (guard instanceof NextResponse) return guard;

        const { data, error } = await parseBody(request, createLabelSchema);
        if (error) return error;

        const label = await prisma.whatsAppLabel.create({
            data: {
                name: String(data.name).trim(),
                color: String(data.color || '#3B82F6'),
            },
        });

        return NextResponse.json({ success: true, label: withDescription(label) });
    } catch (error: any) {
        await logger.error('labels_post_error', 'Erro ao criar etiqueta', error instanceof Error ? error : undefined);
        const message = String(error?.message || '');
        if (message.includes('Unique constraint')) {
            return NextResponse.json({ success: false, error: 'Etiqueta já existe' }, { status: 409 });
        }
        return NextResponse.json({ success: false, error: 'Erro ao criar etiqueta' }, { status: 500 });
    }
}

async function handlePut(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const { data, error } = await parseBody(request, updateLabelSchema);
    if (error) return error;
    const { id, ...updates } = data;

    const label = await prisma.whatsAppLabel.update({
        where: { id: String(id) },
        data: {
            ...(updates.name !== undefined && { name: String(updates.name).trim() }),
            ...(updates.color !== undefined && { color: String(updates.color) }),
        },
    });

    return NextResponse.json({ success: true, label: withDescription(label) });
}

async function handleDelete(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ success: false, error: 'id é obrigatório' }, { status: 400 });
    }

    await prisma.whatsAppLabel.delete({ where: { id } });
    return NextResponse.json({ success: true });
}

export const GET = withRateLimit(withErrorBoundary(handleGet), { max: 30, windowMs: 60_000 });
export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 10, windowMs: 60_000 });
export const PUT = withRateLimit(withErrorBoundary(handlePut), { max: 10, windowMs: 60_000 });
export const DELETE = withRateLimit(withErrorBoundary(handleDelete), { max: 5, windowMs: 60_000 });
