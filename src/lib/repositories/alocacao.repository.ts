import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export interface AlocacaoListParams {
    page?: number;
    pageSize?: number;
    status?: string;
    cuidadorId?: string;
    pacienteId?: string;
}

function buildWhere(params: AlocacaoListParams): Prisma.AlocacaoWhereInput {
    const where: Prisma.AlocacaoWhereInput = {};
    if (params.status) where.status = params.status;
    if (params.cuidadorId) where.cuidadorId = params.cuidadorId;
    if (params.pacienteId) where.pacienteId = params.pacienteId;
    return where;
}

export const alocacaoRepository = {
    async findAll(params: AlocacaoListParams = {}) {
        const page = params.page || 1;
        const pageSize = params.pageSize || 200;
        const where = buildWhere(params);

        const [data, total] = await Promise.all([
            prisma.alocacao.findMany({
                where,
                include: {
                    cuidador: { select: { id: true, nome: true, telefone: true, area: true } },
                    paciente: { select: { id: true, nome: true, telefone: true, hospital: true, quarto: true } },
                },
                orderBy: { dataInicio: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.alocacao.count({ where }),
        ]);

        return { data, total, page, pageSize };
    },

    async findById(id: string) {
        return prisma.alocacao.findUnique({
            where: { id },
            include: { cuidador: true, paciente: true },
        });
    },

    async create(data: Prisma.AlocacaoCreateInput) {
        return prisma.alocacao.create({
            data,
            include: { cuidador: true, paciente: true },
        });
    },

    async update(id: string, data: Prisma.AlocacaoUpdateInput) {
        return prisma.alocacao.update({
            where: { id },
            data,
            include: { cuidador: true, paciente: true },
        });
    },

    async delete(id: string) {
        return prisma.alocacao.delete({ where: { id } });
    },

    async countByStatus() {
        const [total, pendente, confirmado, andamento, concluido] = await Promise.all([
            prisma.alocacao.count(),
            prisma.alocacao.count({ where: { status: 'PENDENTE_FEEDBACK' } }),
            prisma.alocacao.count({ where: { status: 'CONFIRMADO' } }),
            prisma.alocacao.count({ where: { status: 'EM_ANDAMENTO' } }),
            prisma.alocacao.count({ where: { status: 'CONCLUIDO' } }),
        ]);
        return { total, pendente, confirmado, andamento, concluido };
    },

    async count(where?: Prisma.AlocacaoWhereInput) {
        return prisma.alocacao.count({ where });
    },
};
