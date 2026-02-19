import { describe, expect, it } from 'vitest';
import { buildOrcamentoPDFData } from './build-pdf-data';

function createOrcamentoFixture() {
    return {
        id: 'orc_123',
        createdAt: '2026-02-18T00:00:00.000Z',
        cenarioSelecionado: 'recomendado',
        valorFinal: 1000,
        cenarioEconomico: JSON.stringify({
            nome: 'Economico',
            totalSemanal: 900,
            estimativaMensal: 3897,
            plantoes: [{ numero: 1, dia: 'Dom', horario: '07:00-19:00', turno: 'Diurno', cuidador: 'C1', valorCuidador: 750, taxaMA: 150, total: 900 }],
            parametros: { r0: 180, a2p: 50, an: 20, afds: 20, metodoPagamento: 'Pix', periodo: 'Semanal' },
            descontos: [],
        }),
        cenarioRecomendado: JSON.stringify({
            nome: 'Recomendado',
            totalSemanal: 1000,
            estimativaMensal: 4330,
            plantoes: [{ numero: 1, dia: 'Dom', horario: '07:00-19:00', turno: 'Diurno', cuidador: 'C1', valorCuidador: 830, taxaMA: 170, total: 1000 }],
            parametros: { r0: 180, a2p: 50, an: 20, afds: 20, metodoPagamento: 'Pix', periodo: 'Semanal' },
            descontos: [],
        }),
        cenarioPremium: JSON.stringify({
            nome: 'Premium',
            totalSemanal: 1200,
            estimativaMensal: 5196,
            plantoes: [{ numero: 1, dia: 'Dom', horario: '07:00-19:00', turno: 'Diurno', cuidador: 'C1', valorCuidador: 980, taxaMA: 220, total: 1200 }],
            parametros: { r0: 180, a2p: 50, an: 20, afds: 20, metodoPagamento: 'Pix', periodo: 'Semanal' },
            descontos: [],
        }),
    };
}

describe('build-pdf-data', () => {
    it('usa cenario selecionado por override', () => {
        const data = buildOrcamentoPDFData(
            null,
            createOrcamentoFixture(),
            'PROPOSTA',
            { cenarioSelecionado: 'premium' },
        );

        expect(data.cenario.nome).toBe('Premium');
        expect(data.cenario.totalSemanal).toBe(1200);
    });

    it('aplica desconto manual sobre total semanal', () => {
        const data = buildOrcamentoPDFData(
            null,
            createOrcamentoFixture(),
            'PROPOSTA',
            { descontoManualPercent: 10 },
        );

        expect(data.cenario.totalSemanal).toBe(900);
    });

    it('valorFinal sobrescreve total final', () => {
        const data = buildOrcamentoPDFData(
            null,
            createOrcamentoFixture(),
            'CONTRATO',
            { valorFinal: 777.77 },
        );

        expect(data.cenario.totalSemanal).toBe(777.77);
    });

    it('aplica desconto em valor e acrescimo na configuracao comercial', () => {
        const data = buildOrcamentoPDFData(
            null,
            createOrcamentoFixture(),
            'PROPOSTA',
            {
                valorPeriodo: 500,
                descontoManualPercent: 10,
                descontoValor: 20,
                acrescimosValor: 5,
                parcelas: 2,
                entrada: 100,
                dataVencimento: '2026-02-19',
            },
        );

        expect(data.cenario.totalSemanal).toBe(435);
        expect(data.configuracaoComercial.valorPeriodo).toBe(500);
        expect(data.configuracaoComercial.descontoPercentual).toBe(10);
        expect(data.configuracaoComercial.descontoValor).toBe(20);
        expect(data.configuracaoComercial.acrescimosValor).toBe(5);
        expect(data.configuracaoComercial.parcelas).toBe(2);
        expect(data.configuracaoComercial.entrada).toBe(100);
        expect(data.configuracaoComercial.dataVencimento).toBe('19/02/2026');
        expect(data.configuracaoComercial.valorLiquido).toBe(435);
    });

    it('mapeia planejamento 360 vindo das opcoes de envio', () => {
        const data = buildOrcamentoPDFData(
            null,
            createOrcamentoFixture(),
            'PROPOSTA',
            {
                dataInicioCuidado: '2026-02-20',
                dataFimCuidado: '2026-06-20',
                periodicidade: 'SEMANAL',
                semanasPlanejadas: 16,
                mesesPlanejados: 4,
                horasCuidadoDia: 12,
                diasAtendimento: ['seg', 'ter', 'qua'],
                tempoCuidadoDescricao: '12h/dia por 4 meses',
                alocacaoResumo: '2 profissionais fixos',
            },
        );

        expect(data.planejamento?.dataInicioCuidado).toBe('2026-02-20');
        expect(data.planejamento?.periodicidade).toBe('SEMANAL');
        expect(data.planejamento?.diasAtendimento).toEqual(['seg', 'ter', 'qua']);
    });

    it('inclui secoes completas da avaliacao no payload do PDF', () => {
        const avaliacao = {
            dadosDetalhados: JSON.stringify({
                discovery: {
                    gatilho: 'Alta hospitalar',
                    urgencia: 'ALTA',
                },
                patient: {
                    nome: 'Maria',
                    sexo: 'F',
                },
                clinical: {
                    quedas: 'Recorrentes',
                    medicamentos: { total: '4-6' },
                },
                abemid: {
                    observacoes: 'Paciente lucida',
                },
                responsibilities: {
                    insumos: 'Familia',
                },
            }),
        };

        const data = buildOrcamentoPDFData(
            avaliacao as unknown as Record<string, unknown>,
            createOrcamentoFixture(),
            'PROPOSTA',
        );

        expect(Array.isArray(data.avaliacaoSecoes)).toBe(true);
        expect(data.avaliacaoSecoes?.length).toBeGreaterThan(0);
        expect(data.avaliacaoSecoes?.some((secao) => secao.titulo === 'Contexto da Demanda')).toBe(true);
        expect(data.avaliacaoSecoes?.some((secao) => secao.titulo === 'Resumo Clinico')).toBe(true);
    });
});
