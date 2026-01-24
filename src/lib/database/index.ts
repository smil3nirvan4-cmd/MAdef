import { MockRepository } from '../repositories/mock-db';
import { IDatabaseFactory } from '../repositories/types';

// Factory Logic to select DB implementation
let db: IDatabaseFactory;

const FORCE_MOCK = process.env.USE_MOCK_DB === 'true';

try {
    if (FORCE_MOCK) {
        throw new Error('Forcing Mock DB via Env Var');
    }
    // Try to load Prisma Implementation
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaRepository } = require('../repositories/prisma-db');
    db = PrismaRepository;
    console.log('✅ [DB] Using Prisma Real Database');
} catch (e) {
    console.warn('⚠️ [DB] Using In-Memory Mock Repository (Reason: Prisma not found or Mock forced)');
    db = MockRepository;
}

export const DB = db;

// Legacy Adapter exports to maintain compatibility with existing pages without rewriting generic imports immediately
export const prisma = null; // Deprecated access
export const getCuidadoresAguardandoRH = db.cuidador.findAllPending;
export const getCuidadorByPhone = db.cuidador.findByPhone;
export const upsertCuidador = db.cuidador.upsert;

export const getPacientesPrioridadeAlta = db.paciente.findAllHighPriority;
export const getPacienteByPhone = db.paciente.findByPhone;
export const searchPaciente = db.paciente.search;
export const upsertPaciente = db.paciente.upsert;


export const getAvaliacoesPendentes = db.avaliacao.findPending;
export const criarAvaliacao = db.avaliacao.create;

export const getWhatsAppSession = db.whatsapp.getSession;
export const updateWhatsAppSession = db.whatsapp.updateSession;

export const logMessage = db.messaging.logMessage;
export const getAllMessages = db.messaging.getAllRecent;
export const getMessageHistory = db.messaging.getHistory;

export const logFormSubmission = db.form.logSubmission;
export const getFormSubmissions = db.form.getAll;

export const criarOrcamento = db.orcamento.create;
export const atualizarOrcamento = db.orcamento.update;
export const getOrcamentosPaciente = db.orcamento.findByPaciente;

export const criarAlocacao = db.alocacao.create;
export const atualizarAlocacao = db.alocacao.update;
export const getAlocacoesCuidador = db.alocacao.findByCuidador;
export const getAlocacoesPaciente = db.alocacao.findByPaciente;
