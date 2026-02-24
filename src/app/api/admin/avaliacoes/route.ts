import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { E, fail, ok, paginated } from '@/lib/api/response';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { parsePagination, parseSort } from '@/lib/api/query-params';
import { guardCapability } from '@/lib/auth/capability-guard';

const SORTABLE_FIELDS = ['createdAt', 'status'] as const;

function parseSearchFilters(searchParams: URLSearchParams) {
    const status = String(searchParams.get('status') || '').trim();
    const tipo = String(searchParams.get('tipo') || '').trim();
    const search = String(searchParams.get('search') || '').trim();
    const createdFrom = String(searchParams.get('createdFrom') || '').trim();
    const createdTo = String(searchParams.get('createdTo') || '').trim();
    return { status, tipo, search, createdFrom, createdTo };
}

async function handleGet(request: NextRequest) {
    const guard = await guardCapability('VIEW_AVALIACOES');
    if (guard instanceof NextResponse) return guard;

    try {
        const url = new URL(request.url);
        const { page, pageSize } = parsePagination(url);
        const { field, direction } = parseSort(url, [...SORTABLE_FIELDS], 'createdAt', 'desc');
        const { status, tipo, search, createdFrom, createdTo } = parseSearchFilters(url.searchParams);

        const where: any = {};
        if (status && status !== 'ALL') {
            where.status = status;
        }

        if (tipo && tipo !== 'ALL') {
            where.paciente = {
                is: {
                    tipo,
                },
            };
        }

        if (search) {
            const currentPaciente = where.paciente?.is || {};
            where.paciente = {
                is: {
                    ...currentPaciente,
                    OR: [
                        { nome: { contains: search } },
                        { telefone: { contains: search.replace(/\D/g, '') || search } },
                    ],
                },
            };
        }

        if (createdFrom || createdTo) {
            where.createdAt = {
                ...(createdFrom ? { gte: new Date(createdFrom) } : {}),
                ...(createdTo ? { lte: new Date(createdTo) } : {}),
            };
        }

        const [avaliacoes, total] = await Promise.all([
            prisma.avaliacao.findMany({
                where,
                include: {
                    paciente: {
                        select: {
                            id: true,
                            nome: true,
                            telefone: true,
                            tipo: true,
                            cidade: true,
                        },
                    },
                },
                orderBy: [{ [field]: direction }, { createdAt: 'desc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.avaliacao.count({ where }),
        ]);

        return paginated(avaliacoes, { page, pageSize, total });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Falha ao buscar avaliacoes';
        return fail(E.DATABASE_ERROR, message, { status: 500 });
    }
}

async function handlePost(request: NextRequest) {
    const guard = await guardCapability('MANAGE_AVALIACOES');
    if (guard instanceof NextResponse) return guard;

    try {
        const body = await request.json();
        const pacienteId = String(body?.pacienteId || '').trim();
        if (!pacienteId) {
            return fail(E.MISSING_FIELD, 'pacienteId is required', { status: 400, field: 'pacienteId' });
        }

        const avaliacao = await prisma.avaliacao.create({
            data: {
                pacienteId,
                status: body?.status || 'PENDENTE',
                abemidScore: body?.abemidScore ?? null,
                katzScore: body?.katzScore ?? null,
                lawtonScore: body?.lawtonScore ?? null,
                gqp: body?.gqp ?? null,
                nivelSugerido: body?.nivelSugerido ?? null,
                cargaSugerida: body?.cargaSugerida ?? null,
                nivelFinal: body?.nivelFinal ?? null,
                cargaFinal: body?.cargaFinal ?? null,
                dadosDetalhados: body?.dadosDetalhados ? JSON.stringify(body.dadosDetalhados) : null,
            },
            include: {
                paciente: {
                    select: { id: true, nome: true, telefone: true },
                },
            },
        });

        return ok({ avaliacao }, 201);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Falha ao criar avaliacao';
        return fail(E.DATABASE_ERROR, message, { status: 500 });
    }
}

export const GET = withErrorBoundary(handleGet);
export const POST = withErrorBoundary(handlePost);
