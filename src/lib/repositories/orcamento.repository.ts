import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export const orcamentoRepository = {
    async findById(id: string) {
        return prisma.orcamento.findUnique({
            where: { id },
            include: { paciente: true },
        });
    },

    async update(id: string, data: Prisma.OrcamentoUpdateInput) {
        return prisma.orcamento.update({
            where: { id },
            data,
            include: { paciente: true },
        });
    },

    async findLatestForPaciente(pacienteId: string) {
        return prisma.orcamento.findFirst({
            where: { pacienteId },
            orderBy: { createdAt: 'desc' },
        });
    },

    async findLatestAvaliacaoForPaciente(pacienteId: string) {
        return prisma.avaliacao.findFirst({
            where: { pacienteId },
            orderBy: { createdAt: 'desc' },
            select: { id: true },
        });
    },
};
