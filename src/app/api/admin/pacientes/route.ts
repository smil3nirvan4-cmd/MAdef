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

    const where: any = {};
    if (status && status !== 'ALL') where.status = status;
    if (tipo && tipo !== 'ALL') where.tipo = tipo;
    if (cidade) where.cidade = { contains: cidade };

    if (search) {
        where.OR = [
            { nome: { contains: search } },
            { telefone: { contains: search.replace(/\D/g, '') || search } },
            { cidade: { contains: search } },
            { bairro: { contains: search } },
        ];
    }

    const [pacientes, total, totalGeral, totalAtivos, totalLeads, totalAvaliacao] = await Promise.all([
        prisma.paciente.findMany({
            where,
            include: {
                _count: {
                    select: {
                        avaliacoes: true,
                        orcamentos: true,
                        alocacoes: true,
                        mensagens: true,
                    },
                },
            },
            orderBy: [{ [field]: direction }, { createdAt: 'desc' }],
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.paciente.count({ where }),
        prisma.paciente.count(),
        prisma.paciente.count({ where: { status: 'ATIVO' } }),
        prisma.paciente.count({ where: { status: 'LEAD' } }),
        prisma.paciente.count({ where: { status: 'AVALIACAO' } }),
    ]);

    return paginated(
        pacientes,
        { page, pageSize, total },
        200,
        {
            stats: {
                total: totalGeral,
                ativos: totalAtivos,
                leads: totalLeads,
                avaliacao: totalAvaliacao,
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

    const existing = await prisma.paciente.findUnique({ where: { telefone: data.telefone } });
    if (existing) {
        throw new ConflictError('Paciente ja cadastrado com este telefone');
    }

    const paciente = await prisma.paciente.create({
        data: {
            nome: data.nome || null,
            telefone: data.telefone,
            cidade: data.cidade || null,
            bairro: data.bairro || null,
            tipo: data.tipo,
            hospital: data.hospital || null,
            quarto: data.quarto || null,
            prioridade: data.prioridade,
            status: data.status,
        },
    });

    return ok({ paciente }, 201);
};

export const GET = withRateLimit(withErrorBoundary(withRequestContext(getHandler)), { max: 30, windowMs: 60_000 });
export const POST = withRateLimit(withErrorBoundary(withRequestContext(postHandler)), { max: 10, windowMs: 60_000 });
