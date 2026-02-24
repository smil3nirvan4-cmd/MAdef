import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export const cuidadorRepository = {
    async findAll(opts: { status?: string; area?: string; search?: string }) {
        const where: Prisma.CuidadorWhereInput = {};
        if (opts.status && opts.status !== 'ALL') {
            where.status = opts.status;
        } else {
            where.status = { in: ['AGUARDANDO_RH', 'EM_ENTREVISTA', 'CRIADO'] };
        }
        if (opts.area && opts.area !== 'ALL') where.area = opts.area;
        if (opts.search) {
            where.OR = [
                { nome: { contains: opts.search, mode: 'insensitive' } },
                { telefone: { contains: opts.search } },
            ];
        }
        const [cuidadores, stats] = await Promise.all([
            prisma.cuidador.findMany({
                where,
                include: { _count: { select: { mensagens: true, alocacoes: true } } },
                orderBy: { createdAt: 'desc' },
                take: 200,
            }),
            Promise.all([
                prisma.cuidador.count(),
                prisma.cuidador.count({ where: { status: 'AGUARDANDO_RH' } }),
                prisma.cuidador.count({ where: { status: 'EM_ENTREVISTA' } }),
                prisma.cuidador.count({ where: { status: 'APROVADO' } }),
                prisma.cuidador.count({ where: { status: 'REJEITADO' } }),
            ]),
        ]);
        return {
            cuidadores,
            stats: {
                total: stats[0],
                aguardandoRH: stats[1],
                emEntrevista: stats[2],
                aprovados: stats[3],
                rejeitados: stats[4],
            },
        };
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

    async create(data: { nome?: string; telefone: string; area?: string; endereco?: string; competencias?: string }) {
        return prisma.cuidador.create({
            data: { ...data, status: 'CRIADO' },
        });
    },

    async findByPhone(telefone: string) {
        return prisma.cuidador.findUnique({ where: { telefone } });
    },

    async update(id: string, data: Prisma.CuidadorUpdateInput) {
        return prisma.cuidador.update({ where: { id }, data });
    },

    async deleteWithRelations(id: string) {
        await prisma.mensagem.deleteMany({ where: { cuidadorId: id } });
        await prisma.alocacao.deleteMany({ where: { cuidadorId: id } });
        await prisma.cuidador.delete({ where: { id } });
    },
};
