import { describe, it, expect } from 'vitest';
import {
    avaliacaoToOrcamentoInputs,
    avaliacaoToEnterprisePricingInputs,
} from './avaliacao-to-orcamento';

describe('avaliacaoToOrcamentoInputs', () => {
    it('returns BAIXA / CUIDADOR when all scores are healthy', () => {
        const result = avaliacaoToOrcamentoInputs({
            abemidScore: 1,
            katzScore: 6,
            lawtonScore: 8,
        });

        expect(result.metadados.complexidadeInferida).toBe('BAIXA');
        expect(result.metadados.tipoProfissionalInferido).toBe('CUIDADOR');
        expect(result.inputRecomendado.tipoProfissional).toBe('CUIDADOR');
        expect(result.inputRecomendado.complexidade).toBe('BAIXA');
    });

    it('returns MEDIA / AUXILIAR_ENF for moderate scores', () => {
        const result = avaliacaoToOrcamentoInputs({
            abemidScore: 4,
            katzScore: 5,
        });

        expect(result.metadados.complexidadeInferida).toBe('MEDIA');
        expect(result.metadados.tipoProfissionalInferido).toBe('AUXILIAR_ENF');
    });

    it('returns ALTA / TECNICO_ENF for severe scores', () => {
        const result = avaliacaoToOrcamentoInputs({
            abemidScore: 7,
            katzScore: 2,
            lawtonScore: 3,
        });

        expect(result.metadados.complexidadeInferida).toBe('ALTA');
        expect(result.metadados.tipoProfissionalInferido).toBe('TECNICO_ENF');
    });

    it('economico always uses CUIDADOR / BAIXA', () => {
        const result = avaliacaoToOrcamentoInputs({ abemidScore: 8 });
        expect(result.inputEconomico.tipoProfissional).toBe('CUIDADOR');
        expect(result.inputEconomico.complexidade).toBe('BAIXA');
    });

    it('premium always uses TECNICO_ENF / ALTA', () => {
        const result = avaliacaoToOrcamentoInputs({ abemidScore: 1 });
        expect(result.inputPremium.tipoProfissional).toBe('TECNICO_ENF');
        expect(result.inputPremium.complexidade).toBe('ALTA');
    });

    it('infers hours from cargaFinal text', () => {
        const result = avaliacaoToOrcamentoInputs({ cargaFinal: '24h integral' });
        expect(result.metadados.horasDiariasInferidas).toBe(24);
    });

    it('infers 12h from cargaSugerida with "12"', () => {
        const result = avaliacaoToOrcamentoInputs({ cargaSugerida: '12h diurno' });
        expect(result.metadados.horasDiariasInferidas).toBe(12);
    });

    it('infers 6h from cargaFinal with "6"', () => {
        const result = avaliacaoToOrcamentoInputs({ cargaFinal: '6h meio período' });
        expect(result.metadados.horasDiariasInferidas).toBe(6);
    });

    it('defaults to 12h when no hints available', () => {
        const result = avaliacaoToOrcamentoInputs({});
        expect(result.metadados.horasDiariasInferidas).toBe(12);
    });

    it('defaults duracaoDias to 30 when absent', () => {
        const result = avaliacaoToOrcamentoInputs({});
        expect(result.inputRecomendado.duracaoDias).toBe(30);
    });

    it('extracts duracaoDias from dadosDetalhados', () => {
        const result = avaliacaoToOrcamentoInputs({
            dadosDetalhados: JSON.stringify({ orcamento: { duracaoDias: 60 } }),
        });
        expect(result.inputRecomendado.duracaoDias).toBe(60);
    });

    it('sets incluirNoturno when horasDiarias >= 12', () => {
        const result = avaliacaoToOrcamentoInputs({ cargaFinal: '12h' });
        expect(result.inputRecomendado.incluirNoturno).toBe(true);
    });

    it('does not set incluirNoturno for 6h', () => {
        const result = avaliacaoToOrcamentoInputs({ cargaFinal: '6h' });
        expect(result.inputRecomendado.incluirNoturno).toBe(false);
    });

    it('adds warning when abemidScore is missing', () => {
        const result = avaliacaoToOrcamentoInputs({});
        expect(result.metadados.avisos.some(a => a.includes('ABEMID'))).toBe(true);
    });

    it('adds warning when katz is missing', () => {
        const result = avaliacaoToOrcamentoInputs({});
        expect(result.metadados.avisos.some(a => a.includes('Katz'))).toBe(true);
    });

    it('adds warning when lawton is missing', () => {
        const result = avaliacaoToOrcamentoInputs({});
        expect(result.metadados.avisos.some(a => a.includes('Lawton'))).toBe(true);
    });

    it('extracts katz from dadosDetalhados when katzScore is absent', () => {
        const result = avaliacaoToOrcamentoInputs({
            dadosDetalhados: JSON.stringify({
                katz: {
                    banho: 'independente',
                    vestir: 'independente',
                    higiene: 'independente',
                    transferencia: 'dependente',
                    continencia: 'dependente',
                    alimentacao: 'dependente',
                },
            }),
        });
        // katz=3 (3 independente) → <=3 → ALTA
        expect(result.metadados.complexidadeInferida).toBe('ALTA');
    });

    it('extracts lawton from dadosDetalhados when lawtonScore is absent', () => {
        const result = avaliacaoToOrcamentoInputs({
            abemidScore: 1,
            katzScore: 6,
            dadosDetalhados: JSON.stringify({
                lawton: {
                    telefone: 1,
                    compras: 1,
                    cozinhar: 1,
                    tarefas: 1,
                },
            }),
        });
        // All lawton < 2, so 0 items >= 2, score=0, <=4 → ALTA
        expect(result.metadados.complexidadeInferida).toBe('ALTA');
    });

    it('considers clinical conditions for complexity', () => {
        const result = avaliacaoToOrcamentoInputs({
            abemidScore: 1,
            katzScore: 6,
            lawtonScore: 8,
            dadosDetalhados: JSON.stringify({
                clinical: {
                    condicoes: {
                        list: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
                    },
                },
            }),
        });
        // 8 conditions → ALTA
        expect(result.metadados.complexidadeInferida).toBe('ALTA');
    });

    it('handles invalid dadosDetalhados JSON gracefully', () => {
        const result = avaliacaoToOrcamentoInputs({
            dadosDetalhados: 'not json',
        });
        expect(result.metadados.complexidadeInferida).toBe('BAIXA');
    });

    it('handles empty dadosDetalhados string', () => {
        const result = avaliacaoToOrcamentoInputs({
            dadosDetalhados: '   ',
        });
        expect(result.metadados.complexidadeInferida).toBe('BAIXA');
    });
});

describe('avaliacaoToEnterprisePricingInputs', () => {
    it('builds enterprise inputs with all inferred fields', () => {
        const result = avaliacaoToEnterprisePricingInputs({
            abemidScore: 4,
            katzScore: 4,
            lawtonScore: 5,
            cargaFinal: '12h fds',
            dadosDetalhados: JSON.stringify({
                orcamento: {
                    metodoPagamento: 'BOLETO',
                    periodo: 'MENSAL',
                    descontoPresetPercent: 5,
                    descontoManualPercent: 2,
                    duracaoDias: 45,
                },
                clinical: {
                    condicoes: { doencas: ['alzheimer'] },
                },
                discovery: { quantidadePacientes: 2 },
            }),
        });

        expect(result.metadados.complexidadeInferida).toBe('MEDIA');
        expect(result.metadados.tipoProfissionalInferido).toBe('AUXILIAR_ENF');
        expect(result.metadados.horasDiariasInferidas).toBe(12);
        expect(result.metadados.quantidadePacientesInferida).toBe(2);
        expect(result.metadados.doencasInferidas).toContain('ALZHEIMER');

        expect(result.inputRecomendado.profissional).toBe('AUXILIAR_ENF');
        expect(result.inputRecomendado.metodoPagamento).toBe('BOLETO');
        expect(result.inputRecomendado.periodoPagamento).toBe('MENSAL');
        expect(result.inputRecomendado.descontoPresetPercent).toBe(5);
        expect(result.inputRecomendado.descontoManualPercent).toBe(2);
        expect(result.inputRecomendado.quantidadePacientes).toBe(2);
    });

    it('economico uses CUIDADOR, 1 patient, no manual discount, empty diseases', () => {
        const result = avaliacaoToEnterprisePricingInputs({
            abemidScore: 8,
            dadosDetalhados: JSON.stringify({
                clinical: { condicoes: { doencas: ['alzheimer'] } },
            }),
        });

        expect(result.inputEconomico.profissional).toBe('CUIDADOR');
        expect(result.inputEconomico.quantidadePacientes).toBe(1);
        expect(result.inputEconomico.descontoManualPercent).toBe(0);
        expect(result.inputEconomico.diseaseCodes).toEqual([]);
    });

    it('premium uses TECNICO_ENF with altoRisco=true', () => {
        const result = avaliacaoToEnterprisePricingInputs({});

        expect(result.inputPremium.profissional).toBe('TECNICO_ENF');
        expect(result.inputPremium.flags?.altoRisco).toBe(true);
    });

    it('sets noturno flag when horas >= 12', () => {
        const result = avaliacaoToEnterprisePricingInputs({
            cargaFinal: '24h integral',
        });

        expect(result.inputRecomendado.flags?.noturno).toBe(true);
    });

    it('sets fimSemana flag when "fds" in text', () => {
        const result = avaliacaoToEnterprisePricingInputs({
            cargaSugerida: '12h fds',
        });

        expect(result.inputRecomendado.flags?.fimSemana).toBe(true);
    });

    it('sets fimSemana flag when 24h (always)', () => {
        const result = avaliacaoToEnterprisePricingInputs({
            cargaFinal: '24h',
        });

        expect(result.inputRecomendado.flags?.fimSemana).toBe(true);
    });

    it('defaults metodoPagamento to PIX', () => {
        const result = avaliacaoToEnterprisePricingInputs({});
        expect(result.inputRecomendado.metodoPagamento).toBe('PIX');
    });

    it('defaults periodoPagamento to SEMANAL', () => {
        const result = avaliacaoToEnterprisePricingInputs({});
        expect(result.inputRecomendado.periodoPagamento).toBe('SEMANAL');
    });

    it('infers disease codes from clinical conditions text', () => {
        const result = avaliacaoToEnterprisePricingInputs({
            dadosDetalhados: JSON.stringify({
                clinical: {
                    condicoes: {
                        neuro: ['alzheimer', 'parkinson'],
                        cardio: 'AVC severo',
                        cognitivo: 'demência avançada',
                    },
                },
            }),
        });

        expect(result.metadados.doencasInferidas).toContain('ALZHEIMER');
        expect(result.metadados.doencasInferidas).toContain('PARKINSON');
        expect(result.metadados.doencasInferidas).toContain('AVC_SEQUELA');
        expect(result.metadados.doencasInferidas).toContain('DEMENCIA');
    });

    it('handles minicustosDesativados as array', () => {
        const result = avaliacaoToEnterprisePricingInputs({
            dadosDetalhados: JSON.stringify({
                orcamento: {
                    minicustosDesativados: ['VISITA_SUPERVISAO', 'RESERVA_TECNICA'],
                },
            }),
        });

        expect(result.inputRecomendado.minicustosOverrides).toEqual({
            VISITA_SUPERVISAO: false,
            RESERVA_TECNICA: false,
        });
    });

    it('handles minicustosDesativados as CSV string', () => {
        const result = avaliacaoToEnterprisePricingInputs({
            dadosDetalhados: JSON.stringify({
                orcamento: {
                    minicustosDesativados: 'visita_supervisao, reserva_tecnica',
                },
            }),
        });

        expect(result.inputRecomendado.minicustosOverrides).toEqual({
            VISITA_SUPERVISAO: false,
            RESERVA_TECNICA: false,
        });
    });

    it('infers hours from cobertura in discovery', () => {
        const result = avaliacaoToEnterprisePricingInputs({
            dadosDetalhados: JSON.stringify({
                discovery: { cobertura: '24h integral' },
            }),
        });

        expect(result.metadados.horasDiariasInferidas).toBe(24);
    });

    it('infers hours from horasTotais / duracao ratio', () => {
        const result = avaliacaoToEnterprisePricingInputs({
            dadosDetalhados: JSON.stringify({
                orcamento: {
                    horasTotais: 360,
                    duracaoDias: 30,
                },
            }),
        });

        expect(result.metadados.horasDiariasInferidas).toBe(12);
    });

    it('clamps duracaoDias to [1, 365]', () => {
        const result = avaliacaoToEnterprisePricingInputs({
            dadosDetalhados: JSON.stringify({
                orcamento: { duracaoDias: 500 },
            }),
        });
        // 500 > 365 → fallback to 30
        expect(result.inputRecomendado.horas).toBeGreaterThanOrEqual(1);
    });

    it('infers quantidadePacientes from various paths', () => {
        const fromAvaliacao = avaliacaoToEnterprisePricingInputs({
            quantidadePacientes: 3,
        });
        expect(fromAvaliacao.metadados.quantidadePacientesInferida).toBe(3);

        const fromDiscovery = avaliacaoToEnterprisePricingInputs({
            dadosDetalhados: JSON.stringify({
                discovery: { numeroPacientes: 2 },
            }),
        });
        expect(fromDiscovery.metadados.quantidadePacientesInferida).toBe(2);
    });
});
