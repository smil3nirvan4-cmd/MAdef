import {
    IDatabaseFactory,
    ICuidadorRepository,
    IPacienteRepository,
    IWhatsAppSessionRepository,
    IMessagingRepository,
    IFormSubmissionRepository,
    IAvaliacaoRepository
} from './types';

// Global storage to survive HMR
const globalState = globalThis as any;
if (!globalState.mockRepoStore) {
    globalState.mockRepoStore = {
        session: { id: 'main', status: 'DISCONNECTED', qrCode: null, connectedAt: null },
        messages: [],
        cuidadores: [
            { id: '1', telefone: '5511999990001', nome: 'João Silva', area: 'Cuidador de Idosos', status: 'AGUARDANDO_RH', quizScore: 85, createdAt: new Date() }
        ],
        pacientes: [
            { id: 'p1', telefone: '5511988880001', nome: 'Sra. Ana Souza', prioridade: 'ALTA', status: 'LEAD', cidade: 'São Paulo', createdAt: new Date() }
        ],
        submissions: [],
        avaliacoes: [],
        orcamentos: [],
        alocacoes: []
    };
}
const store = globalState.mockRepoStore;

export const MockRepository: IDatabaseFactory = {
    cuidador: {
        async findByPhone(phone) { return store.cuidadores.find((c: any) => c.telefone === phone) || null; },
        async findAllPending() { return store.cuidadores.filter((c: any) => c.status === 'AGUARDANDO_RH'); },
        async upsert(phone, data) {
            const idx = store.cuidadores.findIndex((c: any) => c.telefone === phone);
            if (idx >= 0) {
                store.cuidadores[idx] = { ...store.cuidadores[idx], ...data };
                return store.cuidadores[idx];
            }
            const novo = { id: Date.now().toString(), telefone: phone, ...data, createdAt: new Date() };
            store.cuidadores.push(novo);
            return novo;
        }
    },
    paciente: {
        async findByPhone(phone) { return store.pacientes.find((p: any) => p.telefone === phone) || null; },
        async findAllHighPriority() { return store.pacientes.filter((p: any) => p.prioridade === 'ALTA'); },
        async search(query) {
            const q = query.toLowerCase();
            return store.pacientes.filter((p: any) =>
                p.nome?.toLowerCase().includes(q) || p.telefone.includes(q)
            );
        },
        async upsert(phone, data) {

            const idx = store.pacientes.findIndex((p: any) => p.telefone === phone);
            if (idx >= 0) {
                store.pacientes[idx] = { ...store.pacientes[idx], ...data };
                return store.pacientes[idx];
            }
            const novo = { id: Date.now().toString(), telefone: phone, ...data, createdAt: new Date() };
            store.pacientes.push(novo);
            return novo;
        }
    },
    whatsapp: {
        async getSession() { return store.session; },
        async updateSession(data) {
            store.session = { ...store.session, ...data, updatedAt: new Date() };
            return store.session;
        }
    },
    messaging: {
        async logMessage(data) {
            store.messages.unshift({ id: Date.now().toString(), timestamp: new Date(), ...data });
        },
        async getHistory(phone, limit = 50) {
            return store.messages.filter((m: any) => m.telefone === phone).slice(0, limit);
        },
        async getAllRecent(limit = 100) {
            return store.messages.slice(0, limit);
        }
    },
    form: {
        async logSubmission(tipo, data, phone) {
            const sub = { id: Date.now().toString(), type: tipo, dados: JSON.stringify(data), telefone: phone, createdAt: new Date() };
            store.submissions.unshift(sub);
            return sub;
        },
        async getAll() { return store.submissions; }
    },
    avaliacao: {
        async create(data) {
            const nova = { id: Date.now().toString(), ...data, createdAt: new Date() };
            store.avaliacoes.push(nova);
            return nova;
        },
        async findPending() { return store.avaliacoes.filter((a: any) => a.status === 'PENDENTE'); }
    },
    orcamento: {
        async create(data) {
            const novo = { id: Date.now().toString(), ...data, createdAt: new Date() };
            store.orcamentos.push(novo);
            return novo;
        },
        async update(id, data) {
            const idx = store.orcamentos.findIndex((o: any) => o.id === id);
            if (idx >= 0) {
                store.orcamentos[idx] = { ...store.orcamentos[idx], ...data };
                return store.orcamentos[idx];
            }
            return null;
        },
        async findByPaciente(pacienteId) { return store.orcamentos.filter((o: any) => o.pacienteId === pacienteId); }
    },
    alocacao: {
        async create(data) {
            const novo = { id: Date.now().toString(), ...data, createdAt: new Date() };
            store.alocacoes.push(novo);
            return novo;
        },
        async update(id, data) {
            const idx = store.alocacoes.findIndex((a: any) => a.id === id);
            if (idx >= 0) {
                store.alocacoes[idx] = { ...store.alocacoes[idx], ...data };
                return store.alocacoes[idx];
            }
            return null;
        },
        async findByCuidador(cuidadorId) { return store.alocacoes.filter((a: any) => a.cuidadorId === cuidadorId); },
        async findByPaciente(pacienteId) { return store.alocacoes.filter((a: any) => a.pacienteId === pacienteId); }
    }
};
