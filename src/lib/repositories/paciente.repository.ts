import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export interface PacienteListParams {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    tipo?: string;
    cidade?: string;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
}

function buildWhere(params: PacienteListParams): Prisma.PacienteWhereInput {
    const where: Prisma.PacienteWhereInput = {};
    if (params.status) where.status = params.status;
    if (params.tipo) where.tipo = params.tipo;
    if (params.cidade) where.cidade = { contains: params.cidade };
    if (params.search) {
        where.OR = [
            { nome: { contains: params.search } },
            { telefone: { contains: params.search } },
            { cidade: { contains: params.search } },
            { bairro: { contains: params.search } },
        ];
    }
    return where;
}

const SORTABLE_FIELDS = ['createdAt', 'nome', 'status', 'cidade'] as const;

function buildOrderBy(field?: string, dir?: 'asc' | 'desc'): Prisma.PacienteOrderByWithRelationInput[] {
    const direction = dir || 'desc';
    if (field && (SORTABLE_FIELDS as readonly string[]).includes(field)) {
        return [{ [field]: direction }, { createdAt: 'desc' }];
    }
    return [{ createdAt: 'desc' }];
}

export const pacienteRepository = {
    async findAll(params: PacienteListParams = {}) {
        const page = params.page || 1;
        const pageSize = params.pageSize || 20;
        const where = buildWhere(params);

        const [data, total] = await Promise.all([
            prisma.paciente.findMany({
                where,
                include: {
                    _count: { select: { avaliacoes: true, orcamentos: true, alocacoes: true, mensagens: true } },
                },
                orderBy: buildOrderBy(params.sortField, params.sortDirection),
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.paciente.count({ where }),
        ]);

        return { data, total, page, pageSize };
    },

    async findById(id: string) {
        return prisma.paciente.findUnique({
            where: { id },
            include: {
                avaliacoes: { orderBy: { createdAt: 'desc' }, take: 20 },
                orcamentos: { orderBy: { createdAt: 'desc' }, take: 10 },
                alocacoes: { include: { cuidador: true }, orderBy: { createdAt: 'desc' }, take: 10 },
                mensagens: { orderBy: { timestamp: 'desc' }, take: 100 },
            },
        });
    },

    async create(data: Prisma.PacienteCreateInput) {
        return prisma.paciente.create({ data });
    },

    async update(id: string, data: Prisma.PacienteUpdateInput) {
        return prisma.paciente.update({ where: { id }, data });
    },

    async delete(id: string) {
        return prisma.paciente.delete({ where: { id } });
    },

    async countByStatus() {
        const [total, ativo, lead, avaliacao] = await Promise.all([
            prisma.paciente.count(),
            prisma.paciente.count({ where: { status: 'ATIVO' } }),
            prisma.paciente.count({ where: { status: 'LEAD' } }),
            prisma.paciente.count({ where: { status: 'AVALIACAO' } }),
        ]);
        return { total, ativo, lead, avaliacao };
    },

    async search(query: string, limit = 10) {
        return prisma.paciente.findMany({
            where: {
                OR: [
                    { nome: { contains: query } },
                    { telefone: { contains: query } },
                ],
            },
            take: limit,
        });
    },

    async findByPhone(phone: string) {
        return prisma.paciente.findUnique({ where: { telefone: phone } });
    },

    async count(where?: Prisma.PacienteWhereInput) {
        return prisma.paciente.count({ where });
    },
};
