import { PrismaClient } from '@prisma/client';
import {
    IDatabaseFactory
} from './types';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const PrismaRepository: IDatabaseFactory = {
    cuidador: {
        async findById(id) { return prisma.cuidador.findUnique({ where: { id } }); },
        async findByPhone(phone) { return prisma.cuidador.findUnique({ where: { telefone: phone } }); },
        async findAllPending() { return prisma.cuidador.findMany({ where: { status: 'AGUARDANDO_RH' }, orderBy: { createdAt: 'desc' } }); },
        async upsert(phone, data) {
            return prisma.cuidador.upsert({
                where: { telefone: phone },
                update: data,
                create: { telefone: phone, ...data }
            });
        },
        async update(id, data) { return prisma.cuidador.update({ where: { id }, data }); }
    },
    paciente: {
        async findByPhone(phone) { return prisma.paciente.findUnique({ where: { telefone: phone } }); },
        async findAllHighPriority() { return prisma.paciente.findMany({ where: { prioridade: 'ALTA' }, orderBy: { createdAt: 'desc' } }); },
        async search(query) {
            return prisma.paciente.findMany({
                where: {
                    OR: [
                        { nome: { contains: query } },
                        { telefone: { contains: query } }
                    ]
                },
                take: 10
            });
        },
        async upsert(phone, data) {

            return prisma.paciente.upsert({
                where: { telefone: phone },
                update: data,
                create: { telefone: phone, ...data }
            });
        }
    },
    whatsapp: {
        async getSession() { return prisma.whatsAppSession.findUnique({ where: { id: 'main' } }); },
        async updateSession(data) {
            return prisma.whatsAppSession.upsert({
                where: { id: 'main' },
                update: data,
                create: {
                    id: 'main',
                    status: typeof data.status === 'string' ? data.status : 'DISCONNECTED'
                }
            });
        }
    },
    messaging: {
        async logMessage(data) {
            // Best effort lookup for relation linkage
            const cuidador = await prisma.cuidador.findUnique({ where: { telefone: data.telefone } });
            const paciente = await prisma.paciente.findUnique({ where: { telefone: data.telefone } });

            await prisma.mensagem.create({
                data: {
                    ...data,
                    cuidadorId: cuidador?.id,
                    pacienteId: paciente?.id
                }
            });
        },
        async getHistory(phone, limit = 50) {
            return prisma.mensagem.findMany({ where: { telefone: phone }, orderBy: { timestamp: 'desc' }, take: limit });
        },
        async getAllRecent(limit = 100) {
            return prisma.mensagem.findMany({
                orderBy: { timestamp: 'desc' },
                take: limit,
                include: { cuidador: true, paciente: true }
            });
        }
    },
    form: {
        async logSubmission(tipo, data, phone) {
            return prisma.formSubmission.create({
                data: { tipo, dados: JSON.stringify(data), telefone: phone }
            });
        },
        async getAll() { return prisma.formSubmission.findMany({ orderBy: { createdAt: 'desc' } }); }
    },
    avaliacao: {
        async create(data) { return prisma.avaliacao.create({ data }); },
        async findPending() {
            return prisma.avaliacao.findMany({
                where: { status: { in: ['PENDENTE', 'ENVIADA'] } },
                include: { paciente: true },
                orderBy: { createdAt: 'desc' }
            });
        }
    },
    orcamento: {
        async create(data) { return prisma.orcamento.create({ data }); },
        async update(id, data) { return prisma.orcamento.update({ where: { id }, data }); },
        async findByPaciente(pacienteId) { return prisma.orcamento.findMany({ where: { pacienteId }, orderBy: { createdAt: 'desc' } }); }
    },
    alocacao: {
        async create(data) { return prisma.alocacao.create({ data }); },
        async update(id, data) { return prisma.alocacao.update({ where: { id }, data }); },
        async findByCuidador(cuidadorId) {
            return prisma.alocacao.findMany({
                where: { cuidadorId },
                orderBy: { createdAt: 'desc' },
                include: { cuidador: true, paciente: true }
            });
        },
        async findByPaciente(pacienteId) {
            return prisma.alocacao.findMany({
                where: { pacienteId },
                orderBy: { createdAt: 'desc' },
                include: { cuidador: true, paciente: true }
            });
        }
    }
};
