import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export interface AvaliacaoListParams {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    tipo?: string;
    createdFrom?: string;
    createdTo?: string;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
}

const SORTABLE_FIELDS = ['createdAt', 'status'] as const;

function buildWhere(params: AvaliacaoListParams): Prisma.AvaliacaoWhereInput {
    const where: Prisma.AvaliacaoWhereInput = {};
    if (params.status) where.status = params.status;
    if (params.search || params.tipo) {
        const pacienteFilter: Prisma.PacienteWhereInput = {};
        if (params.tipo) pacienteFilter.tipo = params.tipo;
        if (params.search) {
            pacienteFilter.OR = [
                { nome: { contains: params.search } },
                { telefone: { contains: params.search.replace(/\D/g, '') } },
            ];
        }
        where.paciente = { is: pacienteFilter };
    }
    if (params.createdFrom || params.createdTo) {
        where.createdAt = {};
        if (params.createdFrom) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(params.createdFrom);
        if (params.createdTo) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(params.createdTo);
    }
    return where;
}

function buildOrderBy(field?: string, dir?: 'asc' | 'desc'): Prisma.AvaliacaoOrderByWithRelationInput[] {
    const direction = dir || 'desc';
    if (field && (SORTABLE_FIELDS as readonly string[]).includes(field)) {
        return [{ [field]: direction }, { createdAt: 'desc' }];
    }
    return [{ createdAt: 'desc' }];
}

export const avaliacaoRepository = {
    async findAll(params: AvaliacaoListParams = {}) {
        const page = params.page || 1;
        const pageSize = params.pageSize || 20;
        const where = buildWhere(params);

        const [data, total] = await Promise.all([
            prisma.avaliacao.findMany({
                where,
                include: {
                    paciente: { select: { id: true, nome: true, telefone: true, tipo: true, cidade: true } },
                },
                orderBy: buildOrderBy(params.sortField, params.sortDirection),
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.avaliacao.count({ where }),
        ]);

        return { data, total, page, pageSize };
    },

    async findById(id: string) {
        return prisma.avaliacao.findUnique({
            where: { id },
            include: {
                paciente: {
                    include: {
                        mensagens: { orderBy: { timestamp: 'desc' }, take: 50 },
                        orcamentos: { orderBy: { createdAt: 'desc' }, take: 5 },
                    },
                },
            },
        });
    },

    async create(data: Prisma.AvaliacaoCreateInput) {
        return prisma.avaliacao.create({
            data,
            include: { paciente: { select: { id: true, nome: true, telefone: true } } },
        });
    },

    async update(id: string, data: Prisma.AvaliacaoUpdateInput) {
        return prisma.avaliacao.update({
            where: { id },
            data,
            include: { paciente: true },
        });
    },

    async delete(id: string) {
        return prisma.avaliacao.delete({ where: { id } });
    },

    async count(where?: Prisma.AvaliacaoWhereInput) {
        return prisma.avaliacao.count({ where });
    },

    async findLatestForPaciente(pacienteId: string) {
        return prisma.avaliacao.findFirst({
            where: { pacienteId },
            orderBy: { createdAt: 'desc' },
            select: { id: true },
        });
    },
};
