import { NextRequest, NextResponse } from 'next/server';
import { pacienteRepository } from '@/lib/repositories';
import { withRequestContext } from '@/lib/api/with-request-context';
import { ok, paginated } from '@/lib/api/response';
import { parsePagination, parseSort } from '@/lib/api/query-params';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { z } from 'zod';
import { parseBody } from '@/lib/api/parse-body';
import { ConflictError } from '@/lib/errors';

const SORTABLE_FIELDS = ['createdAt', 'nome', 'status', 'cidade'] as const;

function parseFilters(searchParams: URLSearchParams) {
    return {
        search: String(searchParams.get('search') || '').trim(),
        status: String(searchParams.get('status') || '').trim(),
        tipo: String(searchParams.get('tipo') || '').trim(),
        cidade: String(searchParams.get('cidade') || '').trim(),
    };
}

const getHandler = async (request: NextRequest) => {
    const guard = await guardCapability('VIEW_PACIENTES');
    if (guard instanceof NextResponse) return guard;

    const url = new URL(request.url);
    const { page, pageSize } = parsePagination(url);
    const { field, direction } = parseSort(url, [...SORTABLE_FIELDS], 'createdAt', 'desc');
    const { search, status, tipo, cidade } = parseFilters(url.searchParams);

    const [result, stats] = await Promise.all([
        pacienteRepository.findAll({
            page,
            pageSize,
            search: search || undefined,
            status: (status && status !== 'ALL') ? status : undefined,
            tipo: (tipo && tipo !== 'ALL') ? tipo : undefined,
            cidade: cidade || undefined,
            sortField: field,
            sortDirection: direction,
        }),
        pacienteRepository.countByStatus(),
    ]);

    return paginated(
        result.data,
        { page, pageSize, total: result.total },
        200,
        {
            stats: {
                total: stats.total,
                ativos: stats.ativo,
                leads: stats.lead,
                avaliacao: stats.avaliacao,
            },
        }
    );
};

const postHandler = async (request: NextRequest) => {
    const guard = await guardCapability('MANAGE_PACIENTES');
    if (guard instanceof NextResponse) return guard;

    const createPacienteSchema = z.object({
        telefone: z.string().min(1, 'Telefone é obrigatório'),
        nome: z.string().nullable().optional(),
        cidade: z.string().nullable().optional(),
        bairro: z.string().nullable().optional(),
        tipo: z.string().optional().default('HOME_CARE'),
        hospital: z.string().nullable().optional(),
        quarto: z.string().nullable().optional(),
        prioridade: z.string().optional().default('NORMAL'),
        status: z.string().optional().default('LEAD'),
    });

    const { data, error } = await parseBody(request, createPacienteSchema);
    if (error) return error;

    const existing = await pacienteRepository.findByPhone(data.telefone);
    if (existing) {
        throw new ConflictError('Paciente ja cadastrado com este telefone');
    }

    const paciente = await pacienteRepository.create({
        nome: data.nome || null,
        telefone: data.telefone,
        cidade: data.cidade || null,
        bairro: data.bairro || null,
        tipo: data.tipo,
        hospital: data.hospital || null,
        quarto: data.quarto || null,
        prioridade: data.prioridade,
        status: data.status,
    });

    return ok({ paciente }, 201);
};

export const GET = withRateLimit(withErrorBoundary(withRequestContext(getHandler)), { max: 30, windowMs: 60_000 });
export const POST = withRateLimit(withErrorBoundary(withRequestContext(postHandler)), { max: 10, windowMs: 60_000 });
