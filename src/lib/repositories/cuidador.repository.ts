import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export interface CuidadorListParams {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
    area?: string;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
}

function buildWhere(params: CuidadorListParams): Prisma.CuidadorWhereInput {
    const where: Prisma.CuidadorWhereInput = {};
    if (params.status) {
        where.status = params.status;
    }
    if (params.area) where.area = params.area;
    if (params.search) {
        where.OR = [
            { nome: { contains: params.search } },
            { telefone: { contains: params.search } },
        ];
    }
    return where;
}

export const cuidadorRepository = {
    async findAll(params: CuidadorListParams = {}) {
        const page = params.page || 1;
        const pageSize = params.pageSize || 200;
        const where = buildWhere(params);

        const [data, total] = await Promise.all([
            prisma.cuidador.findMany({
                where,
                include: {
                    _count: { select: { mensagens: true, alocacoes: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.cuidador.count({ where }),
        ]);

        return { data, total, page, pageSize };
    },

    async findById(id: string) {
        return prisma.cuidador.findUnique({
            where: { id },
            include: {
                mensagens: { orderBy: { timestamp: 'desc' }, take: 50 },
                alocacoes: { include: { paciente: true }, orderBy: { createdAt: 'desc' }, take: 20 },
            },
        });
    },

    async findByPhone(phone: string) {
        return prisma.cuidador.findUnique({ where: { telefone: phone } });
    },

    async create(data: Prisma.CuidadorCreateInput) {
        return prisma.cuidador.create({ data });
    },

    async update(id: string, data: Prisma.CuidadorUpdateInput) {
        return prisma.cuidador.update({ where: { id }, data });
    },

    async delete(id: string) {
        await prisma.mensagem.deleteMany({ where: { cuidadorId: id } });
        await prisma.alocacao.deleteMany({ where: { cuidadorId: id } });
        return prisma.cuidador.delete({ where: { id } });
    },

    async countByStatus() {
        const [total, aguardando, entrevista, aprovado, rejeitado] = await Promise.all([
            prisma.cuidador.count(),
            prisma.cuidador.count({ where: { status: 'AGUARDANDO_RH' } }),
            prisma.cuidador.count({ where: { status: 'EM_ENTREVISTA' } }),
            prisma.cuidador.count({ where: { status: 'APROVADO' } }),
            prisma.cuidador.count({ where: { status: 'REJEITADO' } }),
        ]);
        return { total, aguardando, entrevista, aprovado, rejeitado };
    },

    async count(where?: Prisma.CuidadorWhereInput) {
        return prisma.cuidador.count({ where });
    },
};
