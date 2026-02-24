import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export const alocacaoRepository = {
    async findAll(opts: { status?: string; cuidadorId?: string; pacienteId?: string }) {
        const where: Prisma.AlocacaoWhereInput = {};
        if (opts.status && opts.status !== 'ALL') where.status = opts.status;
        if (opts.cuidadorId) where.cuidadorId = opts.cuidadorId;
        if (opts.pacienteId) where.pacienteId = opts.pacienteId;

        const [alocacoes, stats] = await Promise.all([
            prisma.alocacao.findMany({
                where,
                include: {
                    cuidador: { select: { id: true, nome: true, telefone: true, area: true } },
                    paciente: { select: { id: true, nome: true, telefone: true, hospital: true, quarto: true } },
                },
                orderBy: { dataInicio: 'desc' },
                take: 200,
            }),
            Promise.all([
                prisma.alocacao.count(),
                prisma.alocacao.count({ where: { status: 'PENDENTE_FEEDBACK' } }),
                prisma.alocacao.count({ where: { status: 'CONFIRMADO' } }),
                prisma.alocacao.count({ where: { status: 'EM_ANDAMENTO' } }),
                prisma.alocacao.count({ where: { status: 'CONCLUIDO' } }),
            ]),
        ]);

        return {
            alocacoes,
            stats: {
                total: stats[0],
                pendentes: stats[1],
                confirmadas: stats[2],
                emAndamento: stats[3],
                concluidas: stats[4],
            },
        };
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
};
