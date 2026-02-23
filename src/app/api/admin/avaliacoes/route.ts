import { NextRequest, NextResponse } from 'next/server';
import { avaliacaoRepository } from '@/lib/repositories';
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

    const result = await avaliacaoRepository.findAll({
        page,
        pageSize,
        search: search || undefined,
        status: status && status !== 'ALL' ? status : undefined,
        tipo: tipo && tipo !== 'ALL' ? tipo : undefined,
        createdFrom: createdFrom || undefined,
        createdTo: createdTo || undefined,
        sortField: field,
        sortDirection: direction,
    });

    return paginated(result.data, { page, pageSize, total: result.total });
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

    const avaliacao = await avaliacaoRepository.create({
        paciente: { connect: { id: data.pacienteId } },
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
    });

    return ok({ avaliacao }, 201);
};

export const GET = withRateLimit(withErrorBoundary(withRequestContext(getHandler)), { max: 30, windowMs: 60_000 });
export const POST = withRateLimit(withErrorBoundary(withRequestContext(postHandler)), { max: 10, windowMs: 60_000 });
