import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export interface MensagemListParams {
    page?: number;
    pageSize?: number;
    telefone?: string;
    direcao?: string;
    pacienteId?: string | null;
    cuidadorId?: string | null;
    since?: Date;
}

export const mensagemRepository = {
    async findAll(params: MensagemListParams = {}) {
        const page = params.page || 1;
        const pageSize = params.pageSize || 100;
        const where: Prisma.MensagemWhereInput = {};
        if (params.telefone) where.telefone = params.telefone;
        if (params.direcao) where.direcao = params.direcao;
        if (params.pacienteId !== undefined) where.pacienteId = params.pacienteId;
        if (params.cuidadorId !== undefined) where.cuidadorId = params.cuidadorId;
        if (params.since) where.timestamp = { gte: params.since };

        const [data, total] = await Promise.all([
            prisma.mensagem.findMany({
                where,
                include: { cuidador: true, paciente: true },
                orderBy: { timestamp: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.mensagem.count({ where }),
        ]);

        return { data, total, page, pageSize };
    },

    async findByPhone(phone: string, limit = 100) {
        return prisma.mensagem.findMany({
            where: { telefone: phone },
            orderBy: { timestamp: 'desc' },
            take: limit,
        });
    },

    async count(where?: Prisma.MensagemWhereInput) {
        return prisma.mensagem.count({ where });
    },

    async countSince(since: Date) {
        return prisma.mensagem.count({ where: { timestamp: { gte: since } } });
    },

    async activeConversationsSince(since: Date) {
        return prisma.mensagem.groupBy({
            by: ['telefone'],
            where: { timestamp: { gte: since } },
            _count: { _all: true },
        });
    },

    async findFirst(where: Prisma.MensagemWhereInput) {
        return prisma.mensagem.findFirst({ where, orderBy: { timestamp: 'desc' } });
    },
};
