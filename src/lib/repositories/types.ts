export interface ICuidadorRepository {
    findByPhone(phone: string): Promise<any | null>;
    findAllPending(): Promise<any[]>;
    upsert(phone: string, data: any): Promise<any>;
}

export interface IPacienteRepository {
    findByPhone(phone: string): Promise<any | null>;
    findAllHighPriority(): Promise<any[]>;
    search(query: string): Promise<any[]>;
    upsert(phone: string, data: any): Promise<any>;

}

export interface IWhatsAppSessionRepository {
    getSession(): Promise<any | null>;
    updateSession(data: any): Promise<any>;
}

export interface IMessagingRepository {
    logMessage(data: any): Promise<void>;
    getHistory(phone: string, limit?: number): Promise<any[]>;
    getAllRecent(limit?: number): Promise<any[]>;
}

export interface IFormSubmissionRepository {
    logSubmission(tipo: string, data: any, phone?: string): Promise<any>;
    getAll(): Promise<any[]>;
}

export interface IAvaliacaoRepository {
    create(data: any): Promise<any>;
    findPending(): Promise<any[]>;
}

export interface IOrcamentoRepository {
    create(data: any): Promise<any>;
    update(id: string, data: any): Promise<any>;
    findByPaciente(pacienteId: string): Promise<any[]>;
}

export interface IAlocacaoRepository {
    create(data: any): Promise<any>;
    update(id: string, data: any): Promise<any>;
    findByCuidador(cuidadorId: string): Promise<any[]>;
    findByPaciente(pacienteId: string): Promise<any[]>;
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
