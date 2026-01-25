import type { Prisma, Cuidador, Paciente, Mensagem, Avaliacao, Orcamento, Alocacao, FormSubmission, WhatsAppSession } from '@prisma/client';

export type CuidadorWithRelations = Cuidador & {
    alocacoes?: Alocacao[];
    mensagens?: Mensagem[];
};

export type PacienteWithRelations = Paciente & {
    alocacoes?: Alocacao[];
    avaliacoes?: Avaliacao[];
    mensagens?: Mensagem[];
    orcamentos?: Orcamento[];
};

export type AvaliacaoWithPaciente = Avaliacao & {
    paciente: Paciente;
};

export type AlocacaoWithRelations = Alocacao & {
    cuidador: Cuidador;
    paciente?: Paciente | null;
};

export type CuidadorCreateInput = Prisma.CuidadorCreateInput;
export type CuidadorUpdateInput = Prisma.CuidadorUpdateInput;
export type PacienteCreateInput = Prisma.PacienteCreateInput;
export type PacienteUpdateInput = Prisma.PacienteUpdateInput;

export interface ICuidadorRepository {
    findById(id: string): Promise<Cuidador | null>;
    findByPhone(phone: string): Promise<Cuidador | null>;
    findAllPending(): Promise<Cuidador[]>;
    upsert(phone: string, data: Partial<CuidadorCreateInput>): Promise<Cuidador>;
    update(id: string, data: Partial<CuidadorUpdateInput>): Promise<Cuidador>;
}

export interface IPacienteRepository {
    findByPhone(phone: string): Promise<Paciente | null>;
    findAllHighPriority(): Promise<Paciente[]>;
    search(query: string): Promise<Paciente[]>;
    upsert(phone: string, data: Partial<PacienteCreateInput>): Promise<Paciente>;
}

export interface IWhatsAppSessionRepository {
    getSession(): Promise<WhatsAppSession | null>;
    updateSession(data: Prisma.WhatsAppSessionUpdateInput): Promise<WhatsAppSession>;
}

export interface LogMessageInput {
    telefone: string;
    direcao: 'IN' | 'OUT';
    conteudo: string;
    flow?: string;
    step?: string;
    cuidadorId?: string;
    pacienteId?: string;
}

export interface IMessagingRepository {
    logMessage(data: LogMessageInput): Promise<void>;
    getHistory(phone: string, limit?: number): Promise<Mensagem[]>;
    getAllRecent(limit?: number): Promise<Mensagem[]>;
}

export interface IFormSubmissionRepository {
    logSubmission(tipo: string, data: Record<string, unknown>, phone?: string): Promise<FormSubmission>;
    getAll(): Promise<FormSubmission[]>;
}

export interface AvaliacaoCreateInput {
    pacienteId: string;
    abemidScore?: number;
    katzScore?: number;
    lawtonScore?: number;
    gqp?: number;
    nivelSugerido?: string;
    cargaSugerida?: string;
    status?: string;
}

export interface IAvaliacaoRepository {
    create(data: AvaliacaoCreateInput): Promise<Avaliacao>;
    findPending(): Promise<AvaliacaoWithPaciente[]>;
}

export interface OrcamentoCreateInput {
    pacienteId: string;
    cenarioEconomico?: string;
    cenarioRecomendado?: string;
    cenarioPremium?: string;
}

export interface IOrcamentoRepository {
    create(data: OrcamentoCreateInput): Promise<Orcamento>;
    update(id: string, data: Prisma.OrcamentoUpdateInput): Promise<Orcamento>;
    findByPaciente(pacienteId: string): Promise<Orcamento[]>;
}

export interface AlocacaoCreateInput {
    cuidadorId: string;
    pacienteId?: string;
    slotId: string;
    turno: string;
    diaSemana: number;
    dataInicio: Date;
    hospital?: string;
    quarto?: string;
}

export interface IAlocacaoRepository {
    create(data: AlocacaoCreateInput): Promise<Alocacao>;
    update(id: string, data: Prisma.AlocacaoUpdateInput): Promise<Alocacao>;
    findByCuidador(cuidadorId: string): Promise<AlocacaoWithRelations[]>;
    findByPaciente(pacienteId: string): Promise<AlocacaoWithRelations[]>;
}

export interface IDatabaseFactory {
    cuidador: ICuidadorRepository;
    paciente: IPacienteRepository;
    whatsapp: IWhatsAppSessionRepository;
    messaging: IMessagingRepository;
    form: IFormSubmissionRepository;
    avaliacao: IAvaliacaoRepository;
    orcamento: IOrcamentoRepository;
    alocacao: IAlocacaoRepository;
}
