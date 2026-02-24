import { prisma } from '@/lib/prisma';
import { logAudit, computeChanges } from '@/lib/audit';
import {
    IDatabaseFactory
} from './types';

export const PrismaRepository: IDatabaseFactory = {
    cuidador: {
        async findById(id) { return prisma.cuidador.findUnique({ where: { id } }); },
        async findByPhone(phone) { return prisma.cuidador.findUnique({ where: { telefone: phone } }); },
        async findAllPending() { return prisma.cuidador.findMany({ where: { status: 'AGUARDANDO_RH' }, orderBy: { createdAt: 'desc' } }); },
        async upsert(phone, data) {
            const existing = await prisma.cuidador.findUnique({ where: { telefone: phone } });
            const result = await prisma.cuidador.upsert({
                where: { telefone: phone },
                update: data,
                create: { telefone: phone, ...data }
            });
            await logAudit({
                entity: 'Cuidador',
                entityId: result.id,
                action: existing ? 'UPDATE' : 'CREATE',
                before: existing ? (existing as unknown as Record<string, unknown>) : null,
                after: result as unknown as Record<string, unknown>,
            });
            return result;
        },
        async update(id, data) {
            const before = await prisma.cuidador.findUnique({ where: { id } });
            const result = await prisma.cuidador.update({ where: { id }, data });
            await logAudit({
                entity: 'Cuidador',
                entityId: id,
                action: 'UPDATE',
                before: before as unknown as Record<string, unknown>,
                after: result as unknown as Record<string, unknown>,
            });
            return result;
        }
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
            const existing = await prisma.paciente.findUnique({ where: { telefone: phone } });
            const result = await prisma.paciente.upsert({
                where: { telefone: phone },
                update: data,
                create: { telefone: phone, ...data }
            });
            await logAudit({
                entity: 'Paciente',
                entityId: result.id,
                action: existing ? 'UPDATE' : 'CREATE',
                before: existing ? (existing as unknown as Record<string, unknown>) : null,
                after: result as unknown as Record<string, unknown>,
            });
            return result;
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
            // Normalize phone number (remove @lid or @s.whatsapp.net suffix)
            const normalizedPhone = data.telefone.replace('@s.whatsapp.net', '').replace('@lid', '');

            // Best effort lookup for relation linkage using normalized phone
            const cuidador = await prisma.cuidador.findUnique({ where: { telefone: normalizedPhone } });
            const paciente = await prisma.paciente.findUnique({ where: { telefone: normalizedPhone } });

            await prisma.mensagem.create({
                data: {
                    ...data,
                    telefone: normalizedPhone, // Store normalized phone
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
        async create(data) {
            const result = await prisma.avaliacao.create({ data });
            await logAudit({
                entity: 'Avaliacao',
                entityId: result.id,
                action: 'CREATE',
                after: result as unknown as Record<string, unknown>,
            });
            return result;
        },
        async findPending() {
            return prisma.avaliacao.findMany({
                where: { status: { in: ['PENDENTE', 'ENVIADA'] } },
                include: { paciente: true },
                orderBy: { createdAt: 'desc' }
            });
        }
    },
    orcamento: {
        async create(data) {
            const result = await prisma.orcamento.create({ data });
            await logAudit({
                entity: 'Orcamento',
                entityId: result.id,
                action: 'CREATE',
                after: result as unknown as Record<string, unknown>,
            });
            return result;
        },
        async update(id, data) {
            const before = await prisma.orcamento.findUnique({ where: { id } });
            const result = await prisma.orcamento.update({ where: { id }, data });
            await logAudit({
                entity: 'Orcamento',
                entityId: id,
                action: 'UPDATE',
                before: before as unknown as Record<string, unknown>,
                after: result as unknown as Record<string, unknown>,
            });
            return result;
        },
        async findByPaciente(pacienteId) { return prisma.orcamento.findMany({ where: { pacienteId }, orderBy: { createdAt: 'desc' } }); }
    },
    alocacao: {
        async create(data) {
            const result = await prisma.alocacao.create({ data });
            await logAudit({
                entity: 'Alocacao',
                entityId: result.id,
                action: 'CREATE',
                after: result as unknown as Record<string, unknown>,
            });
            return result;
        },
        async update(id, data) {
            const before = await prisma.alocacao.findUnique({ where: { id } });
            const result = await prisma.alocacao.update({ where: { id }, data });
            await logAudit({
                entity: 'Alocacao',
                entityId: id,
                action: 'UPDATE',
                before: before as unknown as Record<string, unknown>,
                after: result as unknown as Record<string, unknown>,
            });
            return result;
        },
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
