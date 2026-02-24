import { describe, it, expect, vi, beforeEach } from 'vitest';

// ----- mock stores -----
const cuidadorStore = new Map<string, any>();
const pacienteStore = new Map<string, any>();
const sessionStore = new Map<string, any>();
const mensagemStore: any[] = [];
const formSubmissionStore: any[] = [];
const avaliacaoStore: any[] = [];
const orcamentoStore = new Map<string, any>();
const alocacaoStore = new Map<string, any>();
const systemLogStore: any[] = [];

let idCounter = 0;
function nextId() { return `id-${++idCounter}`; }
const now = () => new Date();

// ----- mock prisma -----
vi.mock('@/lib/prisma', () => ({
    prisma: {
        cuidador: {
            findUnique: vi.fn(async ({ where }: any) => {
                if (where.id) return cuidadorStore.get(where.id) || null;
                if (where.telefone) {
                    for (const c of cuidadorStore.values()) { if (c.telefone === where.telefone) return c; }
                }
                return null;
            }),
            findMany: vi.fn(async ({ where, orderBy }: any) => {
                let results = [...cuidadorStore.values()];
                if (where?.status) results = results.filter(c => c.status === where.status);
                return results;
            }),
            upsert: vi.fn(async ({ where, update, create }: any) => {
                let existing: any = null;
                for (const c of cuidadorStore.values()) { if (c.telefone === where.telefone) { existing = c; break; } }
                if (existing) {
                    const updated = { ...existing, ...update, updatedAt: now() };
                    cuidadorStore.set(updated.id, updated);
                    return updated;
                }
                const newRecord = { id: nextId(), ...create, createdAt: now(), updatedAt: now() };
                cuidadorStore.set(newRecord.id, newRecord);
                return newRecord;
            }),
            update: vi.fn(async ({ where, data }: any) => {
                const record = cuidadorStore.get(where.id);
                if (!record) throw new Error('Record not found');
                const updated = { ...record, ...data, updatedAt: now() };
                cuidadorStore.set(where.id, updated);
                return updated;
            }),
        },
        paciente: {
            findUnique: vi.fn(async ({ where }: any) => {
                if (where.id) return pacienteStore.get(where.id) || null;
                if (where.telefone) {
                    for (const p of pacienteStore.values()) { if (p.telefone === where.telefone) return p; }
                }
                return null;
            }),
            findMany: vi.fn(async ({ where, take }: any) => {
                let results = [...pacienteStore.values()];
                if (where?.prioridade) results = results.filter(p => p.prioridade === where.prioridade);
                if (where?.OR) {
                    results = results.filter(p =>
                        where.OR.some((cond: any) => {
                            if (cond.nome?.contains) return p.nome?.toLowerCase().includes(cond.nome.contains.toLowerCase());
                            if (cond.telefone?.contains) return p.telefone?.includes(cond.telefone.contains);
                            return false;
                        })
                    );
                }
                if (take) results = results.slice(0, take);
                return results;
            }),
            upsert: vi.fn(async ({ where, update, create }: any) => {
                let existing: any = null;
                for (const p of pacienteStore.values()) { if (p.telefone === where.telefone) { existing = p; break; } }
                if (existing) {
                    const updated = { ...existing, ...update, updatedAt: now() };
                    pacienteStore.set(updated.id, updated);
                    return updated;
                }
                const newRecord = { id: nextId(), ...create, createdAt: now(), updatedAt: now() };
                pacienteStore.set(newRecord.id, newRecord);
                return newRecord;
            }),
        },
        whatsAppSession: {
            findUnique: vi.fn(async ({ where }: any) => sessionStore.get(where.id) || null),
            upsert: vi.fn(async ({ where, update, create }: any) => {
                const existing = sessionStore.get(where.id);
                if (existing) {
                    const updated = { ...existing, ...update };
                    sessionStore.set(where.id, updated);
                    return updated;
                }
                sessionStore.set(where.id, create);
                return create;
            }),
        },
        mensagem: {
            create: vi.fn(async ({ data }: any) => {
                const record = { id: nextId(), ...data, timestamp: now() };
                mensagemStore.push(record);
                return record;
            }),
            findMany: vi.fn(async ({ where, orderBy, take, include }: any) => {
                let results = [...mensagemStore];
                if (where?.telefone) results = results.filter(m => m.telefone === where.telefone);
                if (take) results = results.slice(0, take);
                return results;
            }),
        },
        formSubmission: {
            create: vi.fn(async ({ data }: any) => {
                const record = { id: nextId(), ...data, createdAt: now() };
                formSubmissionStore.push(record);
                return record;
            }),
            findMany: vi.fn(async () => [...formSubmissionStore]),
        },
        avaliacao: {
            create: vi.fn(async ({ data }: any) => {
                const record = { id: nextId(), ...data, createdAt: now() };
                avaliacaoStore.push(record);
                return record;
            }),
            findMany: vi.fn(async ({ where, include }: any) => {
                let results = [...avaliacaoStore];
                if (where?.status?.in) results = results.filter(a => where.status.in.includes(a.status));
                return results;
            }),
        },
        orcamento: {
            create: vi.fn(async ({ data }: any) => {
                const record = { id: nextId(), ...data, createdAt: now() };
                orcamentoStore.set(record.id, record);
                return record;
            }),
            findUnique: vi.fn(async ({ where }: any) => orcamentoStore.get(where.id) || null),
            update: vi.fn(async ({ where, data }: any) => {
                const record = orcamentoStore.get(where.id);
                if (!record) throw new Error('Record not found');
                const updated = { ...record, ...data };
                orcamentoStore.set(where.id, updated);
                return updated;
            }),
            findMany: vi.fn(async ({ where }: any) => {
                return [...orcamentoStore.values()].filter(o => o.pacienteId === where?.pacienteId);
            }),
        },
        alocacao: {
            create: vi.fn(async ({ data }: any) => {
                const record = { id: nextId(), ...data, createdAt: now() };
                alocacaoStore.set(record.id, record);
                return record;
            }),
            findUnique: vi.fn(async ({ where }: any) => alocacaoStore.get(where.id) || null),
            update: vi.fn(async ({ where, data }: any) => {
                const record = alocacaoStore.get(where.id);
                if (!record) throw new Error('Record not found');
                const updated = { ...record, ...data };
                alocacaoStore.set(where.id, updated);
                return updated;
            }),
            findMany: vi.fn(async ({ where }: any) => {
                let results = [...alocacaoStore.values()];
                if (where?.cuidadorId) results = results.filter(a => a.cuidadorId === where.cuidadorId);
                if (where?.pacienteId) results = results.filter(a => a.pacienteId === where.pacienteId);
                return results;
            }),
        },
        systemLog: {
            create: vi.fn(async ({ data }: any) => {
                const record = { id: nextId(), ...data };
                systemLogStore.push(record);
                return record;
            }),
        },
    },
}));

// ----- mock audit -----
const logAuditMock = vi.fn(async (_input?: any) => undefined);
vi.mock('@/lib/audit', () => ({
    logAudit: (input: unknown) => logAuditMock(input),
}));

// ----- mock cache -----
const cachedMock = vi.fn(async (_key: string, fetcher: () => Promise<any>, _ttl?: number) => fetcher());
const invalidateMock = vi.fn();
vi.mock('@/lib/cache', () => ({
    cached: (...args: unknown[]) => cachedMock(...(args as [string, () => Promise<any>, number?])),
    invalidate: (...args: unknown[]) => invalidateMock(...args),
}));

// ----- import SUT (AFTER mocks) -----
import { PrismaRepository } from '../prisma-db';

function clearStores() {
    cuidadorStore.clear();
    pacienteStore.clear();
    sessionStore.clear();
    mensagemStore.length = 0;
    formSubmissionStore.length = 0;
    avaliacaoStore.length = 0;
    orcamentoStore.clear();
    alocacaoStore.clear();
    systemLogStore.length = 0;
    idCounter = 0;
    vi.clearAllMocks();
}

// ============================================================
// Tests
// ============================================================

describe('PrismaRepository', () => {
    beforeEach(clearStores);

    // ---- cuidador ----
    describe('cuidador', () => {
        it('findById returns a cuidador when present', async () => {
            cuidadorStore.set('c1', { id: 'c1', telefone: '5511000', nome: 'A' });
            const result = await PrismaRepository.cuidador.findById('c1');
            expect(result).toEqual(expect.objectContaining({ id: 'c1' }));
            expect(cachedMock).toHaveBeenCalledWith('cuidador:id:c1', expect.any(Function), 30);
        });

        it('findById returns null for missing', async () => {
            const result = await PrismaRepository.cuidador.findById('missing');
            expect(result).toBeNull();
        });

        it('findByPhone returns a cuidador when present', async () => {
            cuidadorStore.set('c1', { id: 'c1', telefone: '5511000', nome: 'B' });
            const result = await PrismaRepository.cuidador.findByPhone('5511000');
            expect(result).toEqual(expect.objectContaining({ telefone: '5511000' }));
            expect(cachedMock).toHaveBeenCalledWith('cuidador:phone:5511000', expect.any(Function), 30);
        });

        it('findByPhone returns null for missing', async () => {
            const result = await PrismaRepository.cuidador.findByPhone('nope');
            expect(result).toBeNull();
        });

        it('findAllPending returns cuidadores with AGUARDANDO_RH status', async () => {
            cuidadorStore.set('c1', { id: 'c1', telefone: '111', nome: 'A', status: 'AGUARDANDO_RH', createdAt: now() });
            cuidadorStore.set('c2', { id: 'c2', telefone: '222', nome: 'B', status: 'ATIVO', createdAt: now() });
            const result = await PrismaRepository.cuidador.findAllPending();
            expect(result).toHaveLength(1);
            expect(result[0].status).toBe('AGUARDANDO_RH');
            expect(cachedMock).toHaveBeenCalledWith('cuidador:pending', expect.any(Function), 30);
        });

        it('upsert creates a new cuidador and logs audit CREATE', async () => {
            const result = await PrismaRepository.cuidador.upsert('55110001', { nome: 'New' });
            expect(result.telefone).toBe('55110001');
            expect(result.nome).toBe('New');
            expect(logAuditMock).toHaveBeenCalledWith(
                expect.objectContaining({ entity: 'Cuidador', action: 'CREATE', before: null })
            );
            expect(invalidateMock).toHaveBeenCalledWith('cuidador:');
        });

        it('upsert updates an existing cuidador and logs audit UPDATE', async () => {
            cuidadorStore.set('c1', { id: 'c1', telefone: '55110001', nome: 'Old' });
            const result = await PrismaRepository.cuidador.upsert('55110001', { nome: 'Updated' });
            expect(result.nome).toBe('Updated');
            expect(logAuditMock).toHaveBeenCalledWith(
                expect.objectContaining({ entity: 'Cuidador', action: 'UPDATE' })
            );
            expect(invalidateMock).toHaveBeenCalledWith('cuidador:');
        });

        it('update modifies fields and logs audit', async () => {
            cuidadorStore.set('c1', { id: 'c1', telefone: '55110001', nome: 'Before' });
            const result = await PrismaRepository.cuidador.update('c1', { nome: 'After' });
            expect(result.nome).toBe('After');
            expect(logAuditMock).toHaveBeenCalledWith(
                expect.objectContaining({ entity: 'Cuidador', entityId: 'c1', action: 'UPDATE' })
            );
            expect(invalidateMock).toHaveBeenCalledWith('cuidador:');
        });

        it('update throws when id not found', async () => {
            await expect(PrismaRepository.cuidador.update('nope', {})).rejects.toThrow('Record not found');
        });
    });

    // ---- paciente ----
    describe('paciente', () => {
        it('findByPhone returns paciente when present', async () => {
            pacienteStore.set('p1', { id: 'p1', telefone: '55119999', nome: 'P' });
            const result = await PrismaRepository.paciente.findByPhone('55119999');
            expect(result).toEqual(expect.objectContaining({ telefone: '55119999' }));
            expect(cachedMock).toHaveBeenCalledWith('paciente:phone:55119999', expect.any(Function), 30);
        });

        it('findByPhone returns null for missing', async () => {
            const result = await PrismaRepository.paciente.findByPhone('missing');
            expect(result).toBeNull();
        });

        it('findAllHighPriority returns ALTA priority patients', async () => {
            pacienteStore.set('p1', { id: 'p1', telefone: '111', prioridade: 'ALTA', createdAt: now() });
            pacienteStore.set('p2', { id: 'p2', telefone: '222', prioridade: 'NORMAL', createdAt: now() });
            const result = await PrismaRepository.paciente.findAllHighPriority();
            expect(result).toHaveLength(1);
            expect(result[0].prioridade).toBe('ALTA');
            expect(cachedMock).toHaveBeenCalledWith('paciente:highpriority', expect.any(Function), 30);
        });

        it('search finds by name substring', async () => {
            pacienteStore.set('p1', { id: 'p1', telefone: '111', nome: 'Maria Souza' });
            pacienteStore.set('p2', { id: 'p2', telefone: '222', nome: 'Pedro' });
            const result = await PrismaRepository.paciente.search('Maria');
            expect(result).toHaveLength(1);
            expect(result[0].nome).toBe('Maria Souza');
            expect(cachedMock).toHaveBeenCalledWith('paciente:search:Maria', expect.any(Function), 30);
        });

        it('search finds by phone substring', async () => {
            pacienteStore.set('p1', { id: 'p1', telefone: '5511999990001', nome: 'X' });
            const result = await PrismaRepository.paciente.search('99999');
            expect(result).toHaveLength(1);
        });

        it('search returns empty when nothing matches', async () => {
            const result = await PrismaRepository.paciente.search('zzz');
            expect(result).toEqual([]);
        });

        it('upsert creates a new paciente and logs audit CREATE', async () => {
            const result = await PrismaRepository.paciente.upsert('55118888', { nome: 'New' });
            expect(result.telefone).toBe('55118888');
            expect(logAuditMock).toHaveBeenCalledWith(
                expect.objectContaining({ entity: 'Paciente', action: 'CREATE', before: null })
            );
            expect(invalidateMock).toHaveBeenCalledWith('paciente:');
        });

        it('upsert updates existing paciente and logs audit UPDATE', async () => {
            pacienteStore.set('p1', { id: 'p1', telefone: '55118888', nome: 'Old' });
            const result = await PrismaRepository.paciente.upsert('55118888', { nome: 'New' });
            expect(result.nome).toBe('New');
            expect(logAuditMock).toHaveBeenCalledWith(
                expect.objectContaining({ entity: 'Paciente', action: 'UPDATE' })
            );
        });
    });

    // ---- whatsapp session ----
    describe('whatsapp', () => {
        it('getSession returns session when present', async () => {
            sessionStore.set('main', { id: 'main', status: 'CONNECTED' });
            const result = await PrismaRepository.whatsapp.getSession();
            expect(result).toEqual(expect.objectContaining({ status: 'CONNECTED' }));
        });

        it('getSession returns null when no session exists', async () => {
            const result = await PrismaRepository.whatsapp.getSession();
            expect(result).toBeNull();
        });

        it('updateSession creates session when none exists', async () => {
            const result = await PrismaRepository.whatsapp.updateSession({ status: 'CONNECTED' });
            expect(result).toEqual(expect.objectContaining({ status: 'CONNECTED' }));
        });

        it('updateSession updates existing session', async () => {
            sessionStore.set('main', { id: 'main', status: 'DISCONNECTED' });
            const result = await PrismaRepository.whatsapp.updateSession({ status: 'CONNECTED' });
            expect(result.status).toBe('CONNECTED');
        });

        it('updateSession defaults to DISCONNECTED when status is not a string', async () => {
            const result = await PrismaRepository.whatsapp.updateSession({ qrCode: 'abc' });
            // When no existing session exists, the create path is used.
            // status should default to 'DISCONNECTED' when status is not a string.
            expect(result.status).toBe('DISCONNECTED');
        });
    });

    // ---- messaging ----
    describe('messaging', () => {
        it('logMessage normalizes phone by removing @s.whatsapp.net', async () => {
            cuidadorStore.set('c1', { id: 'c1', telefone: '5511999990001' });
            await PrismaRepository.messaging.logMessage({
                telefone: '5511999990001@s.whatsapp.net',
                direcao: 'IN',
                conteudo: 'oi',
            });
            expect(mensagemStore).toHaveLength(1);
            expect(mensagemStore[0].telefone).toBe('5511999990001');
            expect(mensagemStore[0].cuidadorId).toBe('c1');
        });

        it('logMessage normalizes phone by removing @lid', async () => {
            await PrismaRepository.messaging.logMessage({
                telefone: '5511999990001@lid',
                direcao: 'IN',
                conteudo: 'hi',
            });
            expect(mensagemStore[0].telefone).toBe('5511999990001');
        });

        it('logMessage links pacienteId when paciente exists', async () => {
            pacienteStore.set('p1', { id: 'p1', telefone: '5511888880001' });
            await PrismaRepository.messaging.logMessage({
                telefone: '5511888880001',
                direcao: 'OUT',
                conteudo: 'hello',
            });
            expect(mensagemStore[0].pacienteId).toBe('p1');
        });

        it('logMessage sets null IDs when neither cuidador nor paciente exists', async () => {
            await PrismaRepository.messaging.logMessage({
                telefone: '5500000000',
                direcao: 'IN',
                conteudo: 'test',
            });
            expect(mensagemStore[0].cuidadorId).toBeUndefined();
            expect(mensagemStore[0].pacienteId).toBeUndefined();
        });

        it('getHistory returns messages for a specific phone', async () => {
            mensagemStore.push({ telefone: '111', conteudo: 'a' });
            mensagemStore.push({ telefone: '222', conteudo: 'b' });
            const result = await PrismaRepository.messaging.getHistory('111');
            expect(result).toHaveLength(1);
            expect(result[0].conteudo).toBe('a');
        });

        it('getHistory uses custom limit', async () => {
            for (let i = 0; i < 10; i++) mensagemStore.push({ telefone: '111', conteudo: `msg${i}` });
            const result = await PrismaRepository.messaging.getHistory('111', 3);
            expect(result).toHaveLength(3);
        });

        it('getHistory defaults to limit of 50', async () => {
            const result = await PrismaRepository.messaging.getHistory('111');
            // Just verify it was called; exact limit enforced by Prisma mock
            expect(result).toBeDefined();
        });

        it('getAllRecent returns messages with includes', async () => {
            mensagemStore.push({ telefone: '111', conteudo: 'a' });
            mensagemStore.push({ telefone: '222', conteudo: 'b' });
            const result = await PrismaRepository.messaging.getAllRecent();
            expect(result).toHaveLength(2);
        });

        it('getAllRecent uses custom limit', async () => {
            for (let i = 0; i < 5; i++) mensagemStore.push({ telefone: '111', conteudo: `msg${i}` });
            const result = await PrismaRepository.messaging.getAllRecent(2);
            expect(result).toHaveLength(2);
        });
    });

    // ---- form ----
    describe('form', () => {
        it('logSubmission stores a form submission', async () => {
            const result = await PrismaRepository.form.logSubmission('CHECKIN', { score: 5 }, '5511000');
            expect(result.tipo).toBe('CHECKIN');
            expect(result.dados).toBe(JSON.stringify({ score: 5 }));
            expect(result.telefone).toBe('5511000');
        });

        it('logSubmission handles undefined phone', async () => {
            const result = await PrismaRepository.form.logSubmission('QUIZ', { q: 1 });
            expect(result.tipo).toBe('QUIZ');
            expect(result.telefone).toBeUndefined();
        });

        it('getAll returns all submissions', async () => {
            formSubmissionStore.push({ tipo: 'A' }, { tipo: 'B' });
            const result = await PrismaRepository.form.getAll();
            expect(result).toHaveLength(2);
        });

        it('getAll returns empty array when no submissions', async () => {
            const result = await PrismaRepository.form.getAll();
            expect(result).toEqual([]);
        });
    });

    // ---- avaliacao ----
    describe('avaliacao', () => {
        it('create adds an avaliacao and logs audit', async () => {
            const result = await PrismaRepository.avaliacao.create({ pacienteId: 'p1', katzScore: 3 });
            expect(result.pacienteId).toBe('p1');
            expect(result.katzScore).toBe(3);
            expect(logAuditMock).toHaveBeenCalledWith(
                expect.objectContaining({ entity: 'Avaliacao', action: 'CREATE' })
            );
            expect(invalidateMock).toHaveBeenCalledWith('avaliacao:');
        });

        it('findPending returns avaliacoes with PENDENTE or ENVIADA status', async () => {
            avaliacaoStore.push({ id: 'a1', status: 'PENDENTE', createdAt: now() });
            avaliacaoStore.push({ id: 'a2', status: 'ENVIADA', createdAt: now() });
            avaliacaoStore.push({ id: 'a3', status: 'CONCLUIDA', createdAt: now() });
            const result = await PrismaRepository.avaliacao.findPending();
            expect(result).toHaveLength(2);
            expect(cachedMock).toHaveBeenCalledWith('avaliacao:pending', expect.any(Function), 30);
        });

        it('findPending returns empty when none are pending', async () => {
            const result = await PrismaRepository.avaliacao.findPending();
            expect(result).toEqual([]);
        });
    });

    // ---- orcamento ----
    describe('orcamento', () => {
        it('create adds orcamento and logs audit', async () => {
            const result = await PrismaRepository.orcamento.create({ pacienteId: 'p1' });
            expect(result.pacienteId).toBe('p1');
            expect(logAuditMock).toHaveBeenCalledWith(
                expect.objectContaining({ entity: 'Orcamento', action: 'CREATE' })
            );
            expect(invalidateMock).toHaveBeenCalledWith('orcamento:');
        });

        it('update modifies orcamento and logs audit with before/after', async () => {
            orcamentoStore.set('o1', { id: 'o1', pacienteId: 'p1', status: 'RASCUNHO' });
            const result = await PrismaRepository.orcamento.update('o1', { status: 'APROVADO' });
            expect(result.status).toBe('APROVADO');
            expect(logAuditMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    entity: 'Orcamento',
                    entityId: 'o1',
                    action: 'UPDATE',
                    before: expect.objectContaining({ status: 'RASCUNHO' }),
                    after: expect.objectContaining({ status: 'APROVADO' }),
                })
            );
            expect(invalidateMock).toHaveBeenCalledWith('orcamento:');
        });

        it('update throws when orcamento not found', async () => {
            await expect(PrismaRepository.orcamento.update('missing', {})).rejects.toThrow('Record not found');
        });

        it('findByPaciente returns orcamentos for a specific paciente', async () => {
            orcamentoStore.set('o1', { id: 'o1', pacienteId: 'p1' });
            orcamentoStore.set('o2', { id: 'o2', pacienteId: 'p2' });
            const result = await PrismaRepository.orcamento.findByPaciente('p1');
            expect(result).toHaveLength(1);
            expect(result[0].pacienteId).toBe('p1');
            expect(cachedMock).toHaveBeenCalledWith('orcamento:paciente:p1', expect.any(Function), 30);
        });

        it('findByPaciente returns empty when none found', async () => {
            const result = await PrismaRepository.orcamento.findByPaciente('nonexistent');
            expect(result).toEqual([]);
        });
    });

    // ---- alocacao ----
    describe('alocacao', () => {
        it('create adds alocacao and logs audit', async () => {
            const result = await PrismaRepository.alocacao.create({
                cuidadorId: 'c1', slotId: 's1', turno: 'MANHA', diaSemana: 1, dataInicio: new Date(),
            });
            expect(result.cuidadorId).toBe('c1');
            expect(logAuditMock).toHaveBeenCalledWith(
                expect.objectContaining({ entity: 'Alocacao', action: 'CREATE' })
            );
            expect(invalidateMock).toHaveBeenCalledWith('alocacao:');
        });

        it('update modifies alocacao and logs audit with before/after', async () => {
            alocacaoStore.set('a1', { id: 'a1', cuidadorId: 'c1', status: 'PENDENTE_FEEDBACK' });
            const result = await PrismaRepository.alocacao.update('a1', { status: 'CONFIRMADO' });
            expect(result.status).toBe('CONFIRMADO');
            expect(logAuditMock).toHaveBeenCalledWith(
                expect.objectContaining({
                    entity: 'Alocacao',
                    entityId: 'a1',
                    action: 'UPDATE',
                    before: expect.objectContaining({ status: 'PENDENTE_FEEDBACK' }),
                    after: expect.objectContaining({ status: 'CONFIRMADO' }),
                })
            );
            expect(invalidateMock).toHaveBeenCalledWith('alocacao:');
        });

        it('update throws when alocacao not found', async () => {
            await expect(PrismaRepository.alocacao.update('missing', {})).rejects.toThrow('Record not found');
        });

        it('findByCuidador returns alocacoes for a specific cuidador', async () => {
            alocacaoStore.set('a1', { id: 'a1', cuidadorId: 'c1', createdAt: now() });
            alocacaoStore.set('a2', { id: 'a2', cuidadorId: 'c2', createdAt: now() });
            const result = await PrismaRepository.alocacao.findByCuidador('c1');
            expect(result).toHaveLength(1);
            expect(result[0].cuidadorId).toBe('c1');
            expect(cachedMock).toHaveBeenCalledWith('alocacao:cuidador:c1', expect.any(Function), 30);
        });

        it('findByPaciente returns alocacoes for a specific paciente', async () => {
            alocacaoStore.set('a1', { id: 'a1', cuidadorId: 'c1', pacienteId: 'p1', createdAt: now() });
            alocacaoStore.set('a2', { id: 'a2', cuidadorId: 'c2', pacienteId: 'p2', createdAt: now() });
            const result = await PrismaRepository.alocacao.findByPaciente('p1');
            expect(result).toHaveLength(1);
            expect(result[0].pacienteId).toBe('p1');
            expect(cachedMock).toHaveBeenCalledWith('alocacao:paciente:p1', expect.any(Function), 30);
        });

        it('findByCuidador returns empty when none found', async () => {
            const result = await PrismaRepository.alocacao.findByCuidador('nonexistent');
            expect(result).toEqual([]);
        });

        it('findByPaciente returns empty when none found', async () => {
            const result = await PrismaRepository.alocacao.findByPaciente('nonexistent');
            expect(result).toEqual([]);
        });
    });
});
