import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRequestContext } from '@/lib/api/with-request-context';
import { ok, paginated } from '@/lib/api/response';
import { parsePagination, parseSort } from '@/lib/api/query-params';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { z } from 'zod';
import { parseBody } from '@/lib/api/parse-body';

const SORTABLE_FIELDS = ['createdAt', 'status'] as const;

function parseSearchFilters(searchParams: URLSearchParams) {
    const status = String(searchParams.get('status') || '').trim();
    const tipo = String(searchParams.get('tipo') || '').trim();
    const search = String(searchParams.get('search') || '').trim();
    const createdFrom = String(searchParams.get('createdFrom') || '').trim();
    const createdTo = String(searchParams.get('createdTo') || '').trim();
    return { status, tipo, search, createdFrom, createdTo };
}

const getHandler = async (request: NextRequest) => {
    const guard = await guardCapability('VIEW_AVALIACOES');
    if (guard instanceof NextResponse) return guard;

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
};

const postHandler = async (request: NextRequest) => {
    const guard = await guardCapability('MANAGE_AVALIACOES');
    if (guard instanceof NextResponse) return guard;

    const createAvaliacaoSchema = z.object({
        pacienteId: z.string().min(1, 'pacienteId is required'),
        status: z.string().optional().default('PENDENTE'),
        abemidScore: z.number().nullable().optional(),
        katzScore: z.number().nullable().optional(),
        lawtonScore: z.number().nullable().optional(),
        gqp: z.number().nullable().optional(),
        nivelSugerido: z.string().nullable().optional(),
        cargaSugerida: z.string().nullable().optional(),
        nivelFinal: z.string().nullable().optional(),
        cargaFinal: z.string().nullable().optional(),
        dadosDetalhados: z.unknown().optional(),
    });

    const { data, error } = await parseBody(request, createAvaliacaoSchema);
    if (error) return error;

    const avaliacao = await prisma.avaliacao.create({
        data: {
            pacienteId: data.pacienteId,
            status: data.status,
            abemidScore: data.abemidScore ?? null,
            katzScore: data.katzScore ?? null,
            lawtonScore: data.lawtonScore ?? null,
            gqp: data.gqp ?? null,
            nivelSugerido: data.nivelSugerido ?? null,
            cargaSugerida: data.cargaSugerida ?? null,
            nivelFinal: data.nivelFinal ?? null,
            cargaFinal: data.cargaFinal ?? null,
            dadosDetalhados: data.dadosDetalhados ? JSON.stringify(data.dadosDetalhados) : null,
        },
        include: {
            paciente: {
                select: { id: true, nome: true, telefone: true },
            },
        },
    });

    return ok({ avaliacao }, 201);
};

export const GET = withRateLimit(withErrorBoundary(withRequestContext(getHandler)), { max: 30, windowMs: 60_000 });
export const POST = withRateLimit(withErrorBoundary(withRequestContext(postHandler)), { max: 10, windowMs: 60_000 });
