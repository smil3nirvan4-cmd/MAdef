import { describe, it, expect, beforeEach } from 'vitest';
import { MockRepository } from '../mock-db';

beforeEach(() => {
    // Clear arrays in existing store (MockRepository holds a direct reference)
    const g = globalThis as any;
    if (g.mockRepoStore) {
        g.mockRepoStore.session = { id: 'main', status: 'DISCONNECTED', qrCode: null, connectedAt: null };
        g.mockRepoStore.messages.length = 0;
        g.mockRepoStore.cuidadores.length = 0;
        g.mockRepoStore.pacientes.length = 0;
        g.mockRepoStore.submissions.length = 0;
        g.mockRepoStore.avaliacoes.length = 0;
        g.mockRepoStore.orcamentos.length = 0;
        g.mockRepoStore.alocacoes.length = 0;
    }
});

describe('cuidador', () => {
    it('findById returns null for missing', async () => {
        expect(await MockRepository.cuidador.findById('xxx')).toBeNull();
    });

    it('upsert creates new cuidador', async () => {
        const c = await MockRepository.cuidador.upsert('5511999990001', { nome: 'João' });
        expect(c.telefone).toBe('5511999990001');
        expect(c.nome).toBe('João');
    });

    it('upsert updates existing cuidador', async () => {
        await MockRepository.cuidador.upsert('5511999990001', { nome: 'João' });
        const c = await MockRepository.cuidador.upsert('5511999990001', { nome: 'João Silva' });
        expect(c.nome).toBe('João Silva');
    });

    it('findByPhone returns cuidador', async () => {
        await MockRepository.cuidador.upsert('5511999990001', { nome: 'João' });
        const c = await MockRepository.cuidador.findByPhone('5511999990001');
        expect(c).not.toBeNull();
        expect(c!.nome).toBe('João');
    });

    it('findAllPending returns AGUARDANDO_RH', async () => {
        await MockRepository.cuidador.upsert('5511999990001', { nome: 'João', status: 'AGUARDANDO_RH' });
        await MockRepository.cuidador.upsert('5511999990002', { nome: 'Maria', status: 'ATIVO' });
        const pending = await MockRepository.cuidador.findAllPending();
        expect(pending).toHaveLength(1);
        expect(pending[0].nome).toBe('João');
    });

    it('update changes fields', async () => {
        const c = await MockRepository.cuidador.upsert('5511999990001', { nome: 'João' });
        const updated = await MockRepository.cuidador.update(c.id, { nome: 'João Updated' });
        expect(updated.nome).toBe('João Updated');
    });

    it('update throws for missing id', async () => {
        await expect(MockRepository.cuidador.update('xxx', {})).rejects.toThrow();
    });
});

describe('paciente', () => {
    it('findByPhone returns null for missing', async () => {
        expect(await MockRepository.paciente.findByPhone('xxx')).toBeNull();
    });

    it('upsert creates new paciente', async () => {
        const p = await MockRepository.paciente.upsert('5511988880001', { nome: 'Ana' });
        expect(p.nome).toBe('Ana');
    });

    it('upsert updates existing paciente', async () => {
        await MockRepository.paciente.upsert('5511988880001', { nome: 'Ana' });
        const p = await MockRepository.paciente.upsert('5511988880001', { nome: 'Ana Souza' });
        expect(p.nome).toBe('Ana Souza');
    });

    it('findAllHighPriority returns ALTA', async () => {
        await MockRepository.paciente.upsert('5511988880001', { nome: 'Ana', prioridade: 'ALTA' });
        await MockRepository.paciente.upsert('5511988880002', { nome: 'Bob', prioridade: 'NORMAL' });
        const alta = await MockRepository.paciente.findAllHighPriority();
        expect(alta).toHaveLength(1);
    });

    it('search finds by name', async () => {
        await MockRepository.paciente.upsert('5511988880001', { nome: 'Ana Souza' });
        const results = await MockRepository.paciente.search('ana');
        expect(results).toHaveLength(1);
    });

    it('search finds by phone', async () => {
        await MockRepository.paciente.upsert('5511988880001', { nome: 'Ana Souza' });
        const results = await MockRepository.paciente.search('88880001');
        expect(results).toHaveLength(1);
    });
});

describe('whatsapp session', () => {
    it('getSession returns current session', async () => {
        const session = await MockRepository.whatsapp.getSession();
        expect(session).not.toBeNull();
        expect(session!.status).toBe('DISCONNECTED');
    });

    it('updateSession merges data', async () => {
        const updated = await MockRepository.whatsapp.updateSession({ status: 'CONNECTED' });
        expect(updated.status).toBe('CONNECTED');
    });
});

describe('messaging', () => {
    it('logMessage adds to store', async () => {
        await MockRepository.messaging.logMessage({
            telefone: '5511999990001', direcao: 'IN', conteudo: 'oi',
        });
        const msgs = await MockRepository.messaging.getAllRecent();
        expect(msgs).toHaveLength(1);
    });

    it('getHistory filters by phone', async () => {
        await MockRepository.messaging.logMessage({ telefone: '5511999990001', direcao: 'IN', conteudo: 'a' });
        await MockRepository.messaging.logMessage({ telefone: '5511999990002', direcao: 'IN', conteudo: 'b' });
        const msgs = await MockRepository.messaging.getHistory('5511999990001');
        expect(msgs).toHaveLength(1);
    });
});

describe('form', () => {
    it('logSubmission stores submission', async () => {
        const sub = await MockRepository.form.logSubmission('CHECKIN', { time: '2025-01-01' }, '5511999990001');
        expect(sub.tipo).toBe('CHECKIN');
    });

    it('getAll returns submissions', async () => {
        await MockRepository.form.logSubmission('CHECKIN', {});
        const all = await MockRepository.form.getAll();
        expect(all).toHaveLength(1);
    });
});

describe('avaliacao', () => {
    it('create adds avaliacao', async () => {
        const a = await MockRepository.avaliacao.create({ pacienteId: 'p1', katzScore: 3 });
        expect(a.katzScore).toBe(3);
        expect(a.status).toBe('PENDENTE');
    });

    it('findPending returns PENDENTE only', async () => {
        await MockRepository.avaliacao.create({ pacienteId: 'p1', status: 'PENDENTE' });
        const pending = await MockRepository.avaliacao.findPending();
        expect(pending).toHaveLength(1);
    });
});

describe('orcamento', () => {
    it('create adds orcamento', async () => {
        const o = await MockRepository.orcamento.create({ pacienteId: 'p1' });
        expect(o.pacienteId).toBe('p1');
        expect(o.status).toBe('RASCUNHO');
    });

    it('update changes orcamento', async () => {
        const o = await MockRepository.orcamento.create({ pacienteId: 'p1' });
        const updated = await MockRepository.orcamento.update(o.id, { status: 'APROVADO' });
        expect(updated.status).toBe('APROVADO');
    });

    it('update throws for missing', async () => {
        await expect(MockRepository.orcamento.update('xxx', {})).rejects.toThrow();
    });

    it('findByPaciente filters', async () => {
        await MockRepository.orcamento.create({ pacienteId: 'p1' });
        await MockRepository.orcamento.create({ pacienteId: 'p2' });
        const results = await MockRepository.orcamento.findByPaciente('p1');
        expect(results).toHaveLength(1);
    });
});

describe('alocacao', () => {
    it('create adds alocacao', async () => {
        const a = await MockRepository.alocacao.create({
            cuidadorId: 'c1', slotId: 's1', turno: 'MANHA', diaSemana: 1, dataInicio: new Date(),
        });
        expect(a.status).toBe('PENDENTE_FEEDBACK');
    });

    it('update changes alocacao', async () => {
        const a = await MockRepository.alocacao.create({
            cuidadorId: 'c1', slotId: 's1', turno: 'MANHA', diaSemana: 1, dataInicio: new Date(),
        });
        const updated = await MockRepository.alocacao.update(a.id, { status: 'CONFIRMADO' });
        expect(updated.status).toBe('CONFIRMADO');
    });

    it('update throws for missing', async () => {
        await expect(MockRepository.alocacao.update('xxx', {})).rejects.toThrow();
    });

    it('findByCuidador filters', async () => {
        await MockRepository.alocacao.create({ cuidadorId: 'c1', slotId: 's1', turno: 'MANHA', diaSemana: 1, dataInicio: new Date() });
        await MockRepository.alocacao.create({ cuidadorId: 'c2', slotId: 's2', turno: 'TARDE', diaSemana: 2, dataInicio: new Date() });
        const results = await MockRepository.alocacao.findByCuidador('c1');
        expect(results).toHaveLength(1);
    });

    it('findByPaciente filters', async () => {
        await MockRepository.alocacao.create({ cuidadorId: 'c1', pacienteId: 'p1', slotId: 's1', turno: 'MANHA', diaSemana: 1, dataInicio: new Date() });
        const results = await MockRepository.alocacao.findByPaciente('p1');
        expect(results).toHaveLength(1);
    });
});
