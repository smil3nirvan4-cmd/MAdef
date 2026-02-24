import { MockRepository } from '../repositories/mock-db';
import type { IDatabaseFactory } from '../repositories/types';
import logger from '@/lib/observability/logger';

// Factory Logic to select DB implementation with async initialization
let db: IDatabaseFactory = MockRepository;
let initialized = false;

const FORCE_MOCK = process.env.USE_MOCK_DB === 'true';
const DATABASE_URL = process.env.DATABASE_URL || '';

// Check if DATABASE_URL is valid for PostgreSQL or SQLite
const isValidPostgresUrl = DATABASE_URL.startsWith('postgresql://') || DATABASE_URL.startsWith('postgres://');
const isValidSqliteUrl = DATABASE_URL.startsWith('file:');
const isValidDatabaseUrl = isValidPostgresUrl || isValidSqliteUrl;

async function initializeDatabase(): Promise<IDatabaseFactory> {
    if (initialized) return db;

    try {
        if (FORCE_MOCK) {
            throw new Error('Forcing Mock DB via Env Var');
        }
        if (!isValidDatabaseUrl) {
            throw new Error('Invalid or missing DATABASE_URL');
        }
        // Dynamic ESM import for Prisma Implementation
        const prismaModule = await import('../repositories/prisma-db');
        db = prismaModule.PrismaRepository;
        logger.info('db.init', 'Using Prisma Real Database', { module: 'database' });
        initialized = true;
        return db;
    } catch (_e) {
        const reason = FORCE_MOCK ? 'Mock forced' : !isValidDatabaseUrl ? 'Invalid DATABASE_URL' : 'Prisma not found';
        logger.warning('db.init', `Using In-Memory Mock Repository (Reason: ${reason})`, { module: 'database', reason });
        db = MockRepository;
        initialized = true;
        return db;
    }
}

// Initialize immediately (fire and forget)
initializeDatabase();

// Export DB factory (will use MockRepository until async init completes)
export const DB = db;

// Legacy Adapter exports - these use getter functions to ensure initialized db is used
export const prisma = null; // Deprecated access

// Wrapper functions that ensure initialization
export const getCuidadoresAguardandoRH = async (...args: Parameters<typeof db.cuidador.findAllPending>) => {
    await initializeDatabase();
    return db.cuidador.findAllPending(...args);
};
export const getCuidadorByPhone = async (...args: Parameters<typeof db.cuidador.findByPhone>) => {
    await initializeDatabase();
    return db.cuidador.findByPhone(...args);
};
export const upsertCuidador = async (...args: Parameters<typeof db.cuidador.upsert>) => {
    await initializeDatabase();
    return db.cuidador.upsert(...args);
};

export const getPacientesPrioridadeAlta = async (...args: Parameters<typeof db.paciente.findAllHighPriority>) => {
    await initializeDatabase();
    return db.paciente.findAllHighPriority(...args);
};
export const getPacienteByPhone = async (...args: Parameters<typeof db.paciente.findByPhone>) => {
    await initializeDatabase();
    return db.paciente.findByPhone(...args);
};
export const searchPaciente = async (...args: Parameters<typeof db.paciente.search>) => {
    await initializeDatabase();
    return db.paciente.search(...args);
};
export const upsertPaciente = async (...args: Parameters<typeof db.paciente.upsert>) => {
    await initializeDatabase();
    return db.paciente.upsert(...args);
};

export const getAvaliacoesPendentes = async (...args: Parameters<typeof db.avaliacao.findPending>) => {
    await initializeDatabase();
    return db.avaliacao.findPending(...args);
};
export const criarAvaliacao = async (...args: Parameters<typeof db.avaliacao.create>) => {
    await initializeDatabase();
    return db.avaliacao.create(...args);
};

export const getWhatsAppSession = async (...args: Parameters<typeof db.whatsapp.getSession>) => {
    await initializeDatabase();
    return db.whatsapp.getSession(...args);
};
export const updateWhatsAppSession = async (...args: Parameters<typeof db.whatsapp.updateSession>) => {
    await initializeDatabase();
    return db.whatsapp.updateSession(...args);
};

export const logMessage = async (...args: Parameters<typeof db.messaging.logMessage>) => {
    await initializeDatabase();
    return db.messaging.logMessage(...args);
};
export const getAllMessages = async (...args: Parameters<typeof db.messaging.getAllRecent>) => {
    await initializeDatabase();
    return db.messaging.getAllRecent(...args);
};
export const getMessageHistory = async (...args: Parameters<typeof db.messaging.getHistory>) => {
    await initializeDatabase();
    return db.messaging.getHistory(...args);
};

export const logFormSubmission = async (...args: Parameters<typeof db.form.logSubmission>) => {
    await initializeDatabase();
    return db.form.logSubmission(...args);
};
export const getFormSubmissions = async (...args: Parameters<typeof db.form.getAll>) => {
    await initializeDatabase();
    return db.form.getAll(...args);
};

export const criarOrcamento = async (...args: Parameters<typeof db.orcamento.create>) => {
    await initializeDatabase();
    return db.orcamento.create(...args);
};
export const atualizarOrcamento = async (...args: Parameters<typeof db.orcamento.update>) => {
    await initializeDatabase();
    return db.orcamento.update(...args);
};
export const getOrcamentosPaciente = async (...args: Parameters<typeof db.orcamento.findByPaciente>) => {
    await initializeDatabase();
    return db.orcamento.findByPaciente(...args);
};

export const criarAlocacao = async (...args: Parameters<typeof db.alocacao.create>) => {
    await initializeDatabase();
    return db.alocacao.create(...args);
};
export const atualizarAlocacao = async (...args: Parameters<typeof db.alocacao.update>) => {
    await initializeDatabase();
    return db.alocacao.update(...args);
};
export const getAlocacoesCuidador = async (...args: Parameters<typeof db.alocacao.findByCuidador>) => {
    await initializeDatabase();
    return db.alocacao.findByCuidador(...args);
};
export const getAlocacoesPaciente = async (...args: Parameters<typeof db.alocacao.findByPaciente>) => {
    await initializeDatabase();
    return db.alocacao.findByPaciente(...args);
};
