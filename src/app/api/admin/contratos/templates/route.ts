import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { guardCapability } from '@/lib/auth/capability-guard';
import { prisma } from '@/lib/prisma';
import {
    extractPlaceholders,
    validateRequiredPlaceholders,
} from '@/lib/contracts/template-engine';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';

const createTemplateSchema = z.object({
    unidadeId: z.string().min(1),
    tipo: z.enum(['CLIENTE', 'PRESTADOR']),
    nome: z.string().min(1).default('Template contrato'),
    conteudo: z.string().min(1),
    publicar: z.boolean().optional(),
    createdBy: z.string().optional(),
});

function parsePlaceholders(value: string | null): string[] {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed.map((item) => String(item));
    } catch {
        return [];
    }
    return [];
}

async function handleGet(request: NextRequest) {
    const guard = await guardCapability('VIEW_ORCAMENTOS');
    if (guard instanceof NextResponse) return guard;

    const url = new URL(request.url);
    const unidadeId = url.searchParams.get('unidadeId') || undefined;
    const tipo = url.searchParams.get('tipo') || undefined;
    const ativo = url.searchParams.get('ativo');

    const rows = await prisma.unidadeContratoTemplate.findMany({
        where: {
            ...(unidadeId ? { unidadeId } : {}),
            ...(tipo ? { tipo } : {}),
            ...(ativo === 'true' ? { ativo: true } : {}),
            ...(ativo === 'false' ? { ativo: false } : {}),
        },
        orderBy: [
            { unidadeId: 'asc' },
            { tipo: 'asc' },
            { versao: 'desc' },
        ],
    });

    return NextResponse.json({
        success: true,
        data: rows.map((row) => ({
            ...row,
            placeholders: parsePlaceholders(row.placeholders),
        })),
    });
}

async function handlePost(request: NextRequest) {
    const guard = await guardCapability('MANAGE_ORCAMENTOS');
    if (guard instanceof NextResponse) return guard;

    const body = await request.json().catch(() => ({}));
    const parsed = createTemplateSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { success: false, error: 'Payload invalido', details: parsed.error.issues },
            { status: 400 },
        );
    }

    const data = parsed.data;
    const placeholders = extractPlaceholders(data.conteudo);
    const missingRequired = validateRequiredPlaceholders(placeholders);

    const maxVersion = await prisma.unidadeContratoTemplate.findFirst({
        where: {
            unidadeId: data.unidadeId,
            tipo: data.tipo,
        },
        orderBy: { versao: 'desc' },
        select: { versao: true },
    });
    const nextVersion = (maxVersion?.versao || 0) + 1;

    const created = await prisma.$transaction(async (tx) => {
        if (data.publicar) {
            await tx.unidadeContratoTemplate.updateMany({
                where: {
                    unidadeId: data.unidadeId,
                    tipo: data.tipo,
                    ativo: true,
                },
                data: { ativo: false },
            });
        }

        return tx.unidadeContratoTemplate.create({
            data: {
                unidadeId: data.unidadeId,
                tipo: data.tipo,
                nome: data.nome,
                versao: nextVersion,
                formato: 'MARKDOWN',
                conteudo: data.conteudo,
                placeholders: JSON.stringify(placeholders),
                ativo: Boolean(data.publicar),
                publicadoEm: data.publicar ? new Date() : null,
                createdBy: data.createdBy || null,
            },
        });
    });

    return NextResponse.json({
        success: true,
        data: {
            ...created,
            placeholders,
            missingRequired,
        },
    });
}

export const GET = withRateLimit(withErrorBoundary(handleGet), { max: 30, windowMs: 60_000 });
export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 10, windowMs: 60_000 });
