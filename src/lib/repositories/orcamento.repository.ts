import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export interface OrcamentoListParams {
    page?: number;
    pageSize?: number;
    pacienteId?: string;
    status?: string;
}

export const orcamentoRepository = {
    async findAll(params: OrcamentoListParams = {}) {
        const page = params.page || 1;
        const pageSize = params.pageSize || 100;
        const where: Prisma.OrcamentoWhereInput = {};
        if (params.pacienteId) where.pacienteId = params.pacienteId;
        if (params.status) where.status = params.status;

        const [data, total] = await Promise.all([
            prisma.orcamento.findMany({
                where,
                include: { paciente: { select: { id: true, nome: true, telefone: true } } },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.orcamento.count({ where }),
        ]);

        return { data, total, page, pageSize };
    },

    async findById(id: string) {
        return prisma.orcamento.findUnique({
            where: { id },
            include: { paciente: true },
        });
    },

    async create(data: Prisma.OrcamentoCreateInput) {
        return prisma.orcamento.create({ data, include: { paciente: true } });
    },

    async update(id: string, data: Prisma.OrcamentoUpdateInput) {
        return prisma.orcamento.update({ where: { id }, data, include: { paciente: true } });
    },

    async delete(id: string) {
        return prisma.orcamento.delete({ where: { id } });
    },

    async count(where?: Prisma.OrcamentoWhereInput) {
        return prisma.orcamento.count({ where });
    },
};
