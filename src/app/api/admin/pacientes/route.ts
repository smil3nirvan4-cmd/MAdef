import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withRequestContext } from '@/lib/api/with-request-context';
import { E, fail, ok, paginated } from '@/lib/api/response';
import { parsePagination, parseSort } from '@/lib/api/query-params';
import { guardCapability } from '@/lib/auth/capability-guard';
import { validateBrazilianPhone } from '@/lib/phone-validator';

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

    try {
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
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao buscar pacientes';
        return fail(E.DATABASE_ERROR, message, { status: 500 });
    }
};

const postHandler = async (request: NextRequest) => {
    const guard = await guardCapability('MANAGE_PACIENTES');
    if (guard instanceof NextResponse) return guard;

    try {
        const body = await request.json();
        const rawTelefone = String(body?.telefone || '').trim();
        if (!rawTelefone) {
            return fail(E.MISSING_FIELD, 'Telefone e obrigatorio', { status: 400, field: 'telefone' });
        }

        // Validate and normalize phone (auto-corrects missing 9th digit)
        const phoneValidation = validateBrazilianPhone(rawTelefone);
        if (!phoneValidation.isValid) {
            return fail(E.VALIDATION_ERROR, phoneValidation.error || 'Telefone invalido', { status: 400, field: 'telefone' });
        }
        const telefone = phoneValidation.whatsapp; // Store normalized E.164 (e.g. 5545991233799)

        // Check both raw input and normalized to prevent duplicates
        const existing = await prisma.paciente.findFirst({
            where: {
                OR: [
                    { telefone },
                    { telefone: rawTelefone },
                    { telefone: rawTelefone.replace(/\D/g, '') },
                ],
            },
        });
        if (existing) {
            return fail(E.CONFLICT, 'Paciente ja cadastrado com este telefone', { status: 409, field: 'telefone' });
        }

        const paciente = await prisma.paciente.create({
            data: {
                nome: body?.nome || null,
                telefone,
                cidade: body?.cidade || null,
                bairro: body?.bairro || null,
                tipo: body?.tipo || 'HOME_CARE',
                hospital: body?.hospital || null,
                quarto: body?.quarto || null,
                prioridade: body?.prioridade || 'NORMAL',
                status: body?.status || 'LEAD',
            },
        });

        return ok({ paciente }, 201);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao criar paciente';
        return fail(E.DATABASE_ERROR, message, { status: 500 });
    }
};

export const GET = withRequestContext(getHandler);
export const POST = withRequestContext(postHandler);

