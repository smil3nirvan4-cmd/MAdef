import type { Cuidador, Paciente, Mensagem, Avaliacao, Orcamento, Alocacao, FormSubmission, WhatsAppSession } from '@prisma/client';
import {
    IDatabaseFactory,
    AvaliacaoCreateInput,
    AlocacaoWithRelations,
    AvaliacaoWithPaciente,
    OrcamentoCreateInput,
} from './types';

// Global storage to survive HMR
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock store uses loose types, cast at boundaries
type MockItem = Record<string, any>;
interface MockStore {
    session: MockItem;
    messages: MockItem[];
    cuidadores: MockItem[];
    pacientes: MockItem[];
    submissions: MockItem[];
    avaliacoes: MockItem[];
    orcamentos: MockItem[];
    alocacoes: MockItem[];
}

const _global = globalThis as typeof globalThis & { mockRepoStore?: MockStore };
if (!_global.mockRepoStore) {
    _global.mockRepoStore = {
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
const store = _global.mockRepoStore;

export const MockRepository: IDatabaseFactory = {
    cuidador: {
        async findById(id) { return (store.cuidadores.find((c) => c.id === id) as Cuidador | undefined) ?? null; },
        async findByPhone(phone) { return (store.cuidadores.find((c) => c.telefone === phone) as Cuidador | undefined) ?? null; },
        async findAllPending() { return store.cuidadores.filter((c) => c.status === 'AGUARDANDO_RH') as Cuidador[]; },
        async upsert(phone, data) {
            const idx = store.cuidadores.findIndex((c) => c.telefone === phone);
            if (idx >= 0) {
                store.cuidadores[idx] = { ...store.cuidadores[idx], ...data };
                return store.cuidadores[idx] as Cuidador;
            }
            const novo = { id: Date.now().toString(), telefone: phone, ...data, createdAt: new Date() };
            store.cuidadores.push(novo);
            return novo as Cuidador;
        },
        async update(id, data) {
            const idx = store.cuidadores.findIndex((c) => c.id === id);
            if (idx >= 0) {
                store.cuidadores[idx] = { ...store.cuidadores[idx], ...data };
                return store.cuidadores[idx] as Cuidador;
            }
            throw new Error('Cuidador not found');
        }
    },
    paciente: {
        async findByPhone(phone) { return (store.pacientes.find((p) => p.telefone === phone) as Paciente | undefined) ?? null; },
        async findAllHighPriority() { return store.pacientes.filter((p) => p.prioridade === 'ALTA') as Paciente[]; },
        async search(query) {
            const q = query.toLowerCase();
            return store.pacientes.filter((p) =>
                p.nome?.toLowerCase().includes(q) || String(p.telefone ?? '').includes(q)
            ) as Paciente[];
        },
        async upsert(phone, data) {
            const idx = store.pacientes.findIndex((p) => p.telefone === phone);
            if (idx >= 0) {
                store.pacientes[idx] = { ...store.pacientes[idx], ...data };
                return store.pacientes[idx] as Paciente;
            }
            const novo = { id: Date.now().toString(), telefone: phone, ...data, createdAt: new Date() };
            store.pacientes.push(novo);
            return novo as Paciente;
        }
    },
    whatsapp: {
        async getSession() { return store.session as WhatsAppSession; },
        async updateSession(data) {
            store.session = { ...store.session, ...data, updatedAt: new Date() };
            return store.session as WhatsAppSession;
        }
    },
    messaging: {
        async logMessage(data) {
            store.messages.unshift({ id: Date.now().toString(), timestamp: new Date(), ...data });
        },
        async getHistory(phone, limit = 50) {
            return store.messages.filter((m) => m.telefone === phone).slice(0, limit) as Mensagem[];
        },
        async getAllRecent(limit = 100) {
            return store.messages.slice(0, limit) as Mensagem[];
        }
    },
    form: {
        async logSubmission(tipo, data, phone) {
            const sub = {
                id: Date.now().toString(),
                tipo,
                dados: JSON.stringify(data),
                telefone: phone || null,
                createdAt: new Date(),
                ipAddress: null,
                userAgent: null
            };
            store.submissions.unshift(sub);
            return sub as FormSubmission;
        },
        async getAll() { return store.submissions as FormSubmission[]; }
    },
    avaliacao: {
        async create(data: AvaliacaoCreateInput) {
            const nova = {
                id: Date.now().toString(),
                pacienteId: data.pacienteId,
                abemidScore: data.abemidScore ?? null,
                katzScore: data.katzScore ?? null,
                lawtonScore: data.lawtonScore ?? null,
                gqp: data.gqp ?? null,
                nivelSugerido: data.nivelSugerido ?? null,
                cargaSugerida: data.cargaSugerida ?? null,
                status: data.status ?? 'PENDENTE',
                dadosDetalhados: data.dadosDetalhados ?? null,
                nivelFinal: null,
                cargaFinal: null,
                avaliadorId: null,
                validadoEm: null,
                // WhatsApp tracking fields
                whatsappEnviado: false,
                whatsappEnviadoEm: null,
                whatsappMessageId: null,
                whatsappErro: null,
                whatsappTentativas: 0,
                valorProposto: null,
                createdAt: new Date()
            };
            store.avaliacoes.push(nova);
            return nova as Avaliacao;
        },
        async findPending() { return store.avaliacoes.filter((a) => a.status === 'PENDENTE') as (Avaliacao & { paciente: Paciente })[]; }
    },
    orcamento: {
        async create(data: OrcamentoCreateInput) {
            const novo = {
                id: Date.now().toString(),
                pacienteId: data.pacienteId,
                unidadeId: data.unidadeId ?? null,
                configVersionId: data.configVersionId ?? null,
                avaliacaoId: data.avaliacaoId ?? null,
                cenarioEconomico: data.cenarioEconomico ?? null,
                cenarioRecomendado: data.cenarioRecomendado ?? null,
                cenarioPremium: data.cenarioPremium ?? null,
                cenarioSelecionado: data.cenarioSelecionado ?? null,
                valorFinal: data.valorFinal ?? null,
                snapshotInput: data.snapshotInput ?? null,
                snapshotOutput: data.snapshotOutput ?? null,
                planningInput: data.planningInput ?? null,
                normalizedSchedule: data.normalizedSchedule ?? null,
                pricingBreakdown: data.pricingBreakdown ?? null,
                calculationHash: data.calculationHash ?? null,
                auditHash: data.auditHash ?? null,
                engineVersion: data.engineVersion ?? null,
                createdBy: data.createdBy ?? null,
                descontoManualPercent: data.descontoManualPercent ?? null,
                minicustosDesativados: data.minicustosDesativados ?? null,
                moeda: data.moeda ?? 'BRL',
                status: data.status ?? 'RASCUNHO',
                aprovadoPor: data.aprovadoPor ?? null,
                enviadoEm: data.enviadoEm ?? null,
                aceitoEm: data.aceitoEm ?? null,
                createdAt: new Date()
            };
            store.orcamentos.push(novo);
            return novo as Orcamento;
        },
        async update(id, data) {
            const idx = store.orcamentos.findIndex((o) => o.id === id);
            if (idx >= 0) {
                store.orcamentos[idx] = { ...store.orcamentos[idx], ...data };
                return store.orcamentos[idx] as Orcamento;
            }
            throw new Error('Orcamento not found');
        },
        async findByPaciente(pacienteId) { return store.orcamentos.filter((o) => o.pacienteId === pacienteId) as Orcamento[]; }
    },
    alocacao: {
        async create(data) {
            const novo = {
                id: Date.now().toString(),
                cuidadorId: data.cuidadorId,
                pacienteId: data.pacienteId ?? null,
                slotId: data.slotId,
                turno: data.turno,
                diaSemana: data.diaSemana,
                dataInicio: data.dataInicio,
                hospital: data.hospital ?? null,
                quarto: data.quarto ?? null,
                status: 'PENDENTE_FEEDBACK',
                ofertadoEm: new Date(),
                respondidoEm: null,
                confirmadoT24: null,
                confirmadoT2: null,
                createdAt: new Date()
            };
            store.alocacoes.push(novo);
            return novo as Alocacao;
        },
        async update(id, data) {
            const idx = store.alocacoes.findIndex((a) => a.id === id);
            if (idx >= 0) {
                store.alocacoes[idx] = { ...store.alocacoes[idx], ...data };
                return store.alocacoes[idx] as Alocacao;
            }
            throw new Error('Alocacao not found');
        },
        async findByCuidador(cuidadorId) {
            return store.alocacoes
                .filter((a) => a.cuidadorId === cuidadorId)
                .map((a) => ({
                    ...a,
                    cuidador: store.cuidadores.find((c) => c.id === a.cuidadorId) ?? {} as Cuidador,
                    paciente: a.pacienteId ? store.pacientes.find((p) => p.id === a.pacienteId) as Paciente | undefined ?? null : null,
                })) as AlocacaoWithRelations[];
        },
        async findByPaciente(pacienteId) {
            return store.alocacoes
                .filter((a) => a.pacienteId === pacienteId)
                .map((a) => ({
                    ...a,
                    cuidador: store.cuidadores.find((c) => c.id === a.cuidadorId) ?? {} as Cuidador,
                    paciente: a.pacienteId ? store.pacientes.find((p) => p.id === a.pacienteId) as Paciente | undefined ?? null : null,
                })) as AlocacaoWithRelations[];
        }
    }
};
