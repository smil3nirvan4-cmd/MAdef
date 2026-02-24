import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export const avaliacaoRepository = {
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

    async findByIdWithPaciente(id: string) {
        return prisma.avaliacao.findUnique({
            where: { id },
            include: { paciente: true },
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
};
