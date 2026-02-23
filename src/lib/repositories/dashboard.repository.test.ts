import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
    paciente: {
        count: vi.fn(),
    },
    cuidador: {
        count: vi.fn(),
    },
    avaliacao: {
        count: vi.fn(),
    },
    orcamento: {
        count: vi.fn(),
    },
    mensagem: {
        count: vi.fn(),
        groupBy: vi.fn(),
    },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { dashboardRepository } from './dashboard.repository';

describe('dashboardRepository', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        // Fix the time to 2026-02-23T12:00:00Z (Monday)
        vi.setSystemTime(new Date('2026-02-23T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    function setupMockCounts(overrides: Partial<Record<string, number>> = {}) {
        const defaults: Record<string, number> = {
            pacientesAtivos: 10,
            pacientesNovos: 3,
            pacientesTotal: 50,
            pacientesAtivosLeads: 20,
            cuidadoresTotal: 100,
            cuidadoresAprovados: 70,
            cuidadoresAguardando: 15,
            avaliacoesTotal: 200,
            avaliacoesPendentes: 8,
            avaliacoesHoje: 2,
            orcamentosTotal: 150,
            msgHoje: 45,
            msg24h: 120,
            msgSemana: 500,
        };
        const vals = { ...defaults, ...overrides };

        // paciente.count is called 4 times
        mockPrisma.paciente.count
            .mockResolvedValueOnce(vals.pacientesAtivos)
            .mockResolvedValueOnce(vals.pacientesNovos)
            .mockResolvedValueOnce(vals.pacientesTotal)
            .mockResolvedValueOnce(vals.pacientesAtivosLeads);

        // cuidador.count is called 3 times
        mockPrisma.cuidador.count
            .mockResolvedValueOnce(vals.cuidadoresTotal)
            .mockResolvedValueOnce(vals.cuidadoresAprovados)
            .mockResolvedValueOnce(vals.cuidadoresAguardando);

        // avaliacao.count is called 3 times
        mockPrisma.avaliacao.count
            .mockResolvedValueOnce(vals.avaliacoesTotal)
            .mockResolvedValueOnce(vals.avaliacoesPendentes)
            .mockResolvedValueOnce(vals.avaliacoesHoje);

        // orcamento.count is called 1 time
        mockPrisma.orcamento.count
            .mockResolvedValueOnce(vals.orcamentosTotal);

        // mensagem.count is called 3 times
        mockPrisma.mensagem.count
            .mockResolvedValueOnce(vals.msgHoje)
            .mockResolvedValueOnce(vals.msg24h)
            .mockResolvedValueOnce(vals.msgSemana);

        return vals;
    }

    describe('getStats', () => {
        it('returns all consolidated stats correctly', async () => {
            setupMockCounts();
            mockPrisma.mensagem.groupBy.mockResolvedValue([
                { telefone: '5511111', _count: { _all: 5 } },
                { telefone: '5522222', _count: { _all: 3 } },
                { telefone: '5533333', _count: { _all: 1 } },
            ]);

            const result = await dashboardRepository.getStats();

            expect(result).toEqual({
                pacientes: { ativos: 10, novos: 3, total: 50, ativosLeads: 20 },
                cuidadores: { total: 100, aprovados: 70, aguardando: 15 },
                avaliacoes: { total: 200, pendentes: 8, hoje: 2 },
                orcamentos: { total: 150 },
                mensagens: { hoje: 45, last24h: 120, semana: 500, conversasAtivas: 3 },
            });
        });

        it('returns conversasAtivas as length of groupBy result', async () => {
            setupMockCounts();
            mockPrisma.mensagem.groupBy.mockResolvedValue([]);

            const result = await dashboardRepository.getStats();

            expect(result.mensagens.conversasAtivas).toBe(0);
        });

        it('handles zero counts across all models', async () => {
            setupMockCounts({
                pacientesAtivos: 0,
                pacientesNovos: 0,
                pacientesTotal: 0,
                pacientesAtivosLeads: 0,
                cuidadoresTotal: 0,
                cuidadoresAprovados: 0,
                cuidadoresAguardando: 0,
                avaliacoesTotal: 0,
                avaliacoesPendentes: 0,
                avaliacoesHoje: 0,
                orcamentosTotal: 0,
                msgHoje: 0,
                msg24h: 0,
                msgSemana: 0,
            });
            mockPrisma.mensagem.groupBy.mockResolvedValue([]);

            const result = await dashboardRepository.getStats();

            expect(result.pacientes).toEqual({ ativos: 0, novos: 0, total: 0, ativosLeads: 0 });
            expect(result.cuidadores).toEqual({ total: 0, aprovados: 0, aguardando: 0 });
            expect(result.avaliacoes).toEqual({ total: 0, pendentes: 0, hoje: 0 });
            expect(result.orcamentos).toEqual({ total: 0 });
            expect(result.mensagens).toEqual({ hoje: 0, last24h: 0, semana: 0, conversasAtivas: 0 });
        });

        it('queries pacientes ativos with correct status list', async () => {
            setupMockCounts();
            mockPrisma.mensagem.groupBy.mockResolvedValue([]);

            await dashboardRepository.getStats();

            // First paciente.count call: ativos
            expect(mockPrisma.paciente.count).toHaveBeenNthCalledWith(1, {
                where: { status: { in: ['LEAD', 'AVALIACAO', 'PROPOSTA_ENVIADA', 'CONTRATO_ENVIADO'] } },
            });
        });

        it('queries pacientes novos with gte weekStart date', async () => {
            setupMockCounts();
            mockPrisma.mensagem.groupBy.mockResolvedValue([]);

            await dashboardRepository.getStats();

            // Second paciente.count call: novos (gte weekStart)
            const secondCall = mockPrisma.paciente.count.mock.calls[1][0];
            expect(secondCall.where.createdAt).toBeDefined();
            expect(secondCall.where.createdAt.gte).toBeInstanceOf(Date);
        });

        it('queries pacientes total with no where clause', async () => {
            setupMockCounts();
            mockPrisma.mensagem.groupBy.mockResolvedValue([]);

            await dashboardRepository.getStats();

            // Third paciente.count call: total (no filter)
            expect(mockPrisma.paciente.count).toHaveBeenNthCalledWith(3);
        });

        it('queries cuidadores with correct status filters', async () => {
            setupMockCounts();
            mockPrisma.mensagem.groupBy.mockResolvedValue([]);

            await dashboardRepository.getStats();

            expect(mockPrisma.cuidador.count).toHaveBeenCalledTimes(3);
            expect(mockPrisma.cuidador.count).toHaveBeenNthCalledWith(1);
            expect(mockPrisma.cuidador.count).toHaveBeenNthCalledWith(2, { where: { status: 'APROVADO' } });
            expect(mockPrisma.cuidador.count).toHaveBeenNthCalledWith(3, { where: { status: 'AGUARDANDO_RH' } });
        });

        it('queries avaliacoes with correct filters including today date', async () => {
            setupMockCounts();
            mockPrisma.mensagem.groupBy.mockResolvedValue([]);

            await dashboardRepository.getStats();

            expect(mockPrisma.avaliacao.count).toHaveBeenCalledTimes(3);
            // First: total
            expect(mockPrisma.avaliacao.count).toHaveBeenNthCalledWith(1);
            // Second: pendentes
            expect(mockPrisma.avaliacao.count).toHaveBeenNthCalledWith(2, { where: { status: 'PENDENTE' } });
            // Third: hoje (with gte today)
            const thirdCall = mockPrisma.avaliacao.count.mock.calls[2][0];
            expect(thirdCall.where.createdAt.gte).toBeInstanceOf(Date);
        });

        it('queries mensagens groupBy with telefone and 24h filter', async () => {
            setupMockCounts();
            mockPrisma.mensagem.groupBy.mockResolvedValue([{ telefone: '5511111', _count: { _all: 2 } }]);

            await dashboardRepository.getStats();

            expect(mockPrisma.mensagem.groupBy).toHaveBeenCalledWith({
                by: ['telefone'],
                where: { timestamp: { gte: expect.any(Date) } },
                _count: { _all: true },
            });
        });

        it('counts many active conversations correctly', async () => {
            setupMockCounts();
            const manyConversations = Array.from({ length: 25 }, (_, i) => ({
                telefone: `551100${i}`,
                _count: { _all: i + 1 },
            }));
            mockPrisma.mensagem.groupBy.mockResolvedValue(manyConversations);

            const result = await dashboardRepository.getStats();

            expect(result.mensagens.conversasAtivas).toBe(25);
        });

        it('calls the correct total number of prisma operations', async () => {
            setupMockCounts();
            mockPrisma.mensagem.groupBy.mockResolvedValue([]);

            await dashboardRepository.getStats();

            // 4 paciente.count + 3 cuidador.count + 3 avaliacao.count + 1 orcamento.count + 3 mensagem.count + 1 mensagem.groupBy = 15
            expect(mockPrisma.paciente.count).toHaveBeenCalledTimes(4);
            expect(mockPrisma.cuidador.count).toHaveBeenCalledTimes(3);
            expect(mockPrisma.avaliacao.count).toHaveBeenCalledTimes(3);
            expect(mockPrisma.orcamento.count).toHaveBeenCalledTimes(1);
            expect(mockPrisma.mensagem.count).toHaveBeenCalledTimes(3);
            expect(mockPrisma.mensagem.groupBy).toHaveBeenCalledTimes(1);
        });

        it('returns correct structure shape with all top-level keys', async () => {
            setupMockCounts();
            mockPrisma.mensagem.groupBy.mockResolvedValue([]);

            const result = await dashboardRepository.getStats();

            expect(Object.keys(result)).toEqual(['pacientes', 'cuidadores', 'avaliacoes', 'orcamentos', 'mensagens']);
            expect(Object.keys(result.pacientes)).toEqual(['ativos', 'novos', 'total', 'ativosLeads']);
            expect(Object.keys(result.cuidadores)).toEqual(['total', 'aprovados', 'aguardando']);
            expect(Object.keys(result.avaliacoes)).toEqual(['total', 'pendentes', 'hoje']);
            expect(Object.keys(result.orcamentos)).toEqual(['total']);
            expect(Object.keys(result.mensagens)).toEqual(['hoje', 'last24h', 'semana', 'conversasAtivas']);
        });
    });
});
