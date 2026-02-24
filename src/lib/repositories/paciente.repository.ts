import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export const pacienteRepository = {
    async findAll(opts: { page?: number; pageSize?: number; search?: string; status?: string }) {
        const page = opts.page || 1;
        const pageSize = opts.pageSize || 50;
        const where: Prisma.PacienteWhereInput = {};
        if (opts.status && opts.status !== 'ALL') where.status = opts.status;
        if (opts.search) {
            where.OR = [
                { nome: { contains: opts.search, mode: 'insensitive' } },
                { telefone: { contains: opts.search } },
            ];
        }
        const [items, total] = await Promise.all([
            prisma.paciente.findMany({
                where,
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.paciente.count({ where }),
        ]);
        return { items, total, page, pageSize };
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

    async findLeads(opts: { search?: string; status?: string }) {
        const where: Prisma.PacienteWhereInput = {
            status: { in: ['LEAD', 'AVALIACAO', 'PROPOSTA_ENVIADA', 'CONTRATO_ENVIADO'] },
        };
        if (opts.status && opts.status !== 'ALL') where.status = opts.status;
        if (opts.search) {
            where.OR = [
                { nome: { contains: opts.search, mode: 'insensitive' } },
                { telefone: { contains: opts.search } },
            ];
        }
        const [leads, stats] = await Promise.all([
            prisma.paciente.findMany({
                where,
                include: { _count: { select: { avaliacoes: true, mensagens: true } } },
                orderBy: { createdAt: 'desc' },
                take: 200,
            }),
            Promise.all([
                prisma.paciente.count({ where: { status: { in: ['LEAD', 'AVALIACAO', 'PROPOSTA_ENVIADA', 'CONTRATO_ENVIADO'] } } }),
                prisma.paciente.count({ where: { status: 'LEAD' } }),
                prisma.paciente.count({ where: { status: 'AVALIACAO' } }),
                prisma.paciente.count({ where: { status: 'PROPOSTA_ENVIADA' } }),
                prisma.paciente.count({ where: { status: 'CONTRATO_ENVIADO' } }),
            ]),
        ]);
        return {
            leads,
            stats: {
                total: stats[0],
                leads: stats[1],
                avaliacao: stats[2],
                proposta: stats[3],
                contrato: stats[4],
            },
        };
    },

    async update(id: string, data: Prisma.PacienteUpdateInput) {
        return prisma.paciente.update({ where: { id }, data });
    },

    async findByIdWithAllRelations(id: string) {
        return prisma.paciente.findUnique({
            where: { id },
            include: {
                avaliacoes: { orderBy: { createdAt: 'desc' }, take: 20 },
                orcamentos: { orderBy: { createdAt: 'desc' }, take: 20 },
                alocacoes: { include: { cuidador: true }, orderBy: { createdAt: 'desc' }, take: 20 },
                mensagens: { orderBy: { timestamp: 'desc' }, take: 100 },
            },
        });
    },

    async findUnlinkedMessages(telefone: string) {
        return prisma.mensagem.findMany({
            where: { telefone, pacienteId: null },
            orderBy: { timestamp: 'desc' },
            take: 100,
        });
    },

    async findFormSubmissions(telefone: string) {
        return prisma.formSubmission.findMany({
            where: { telefone },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });
    },
};
