import { describe, it, expect } from 'vitest';
import { calcularABEMID } from './abemid';
import type { ABEMIDEvaluation } from '../../types/evaluation';

describe('ABEMID Evaluation Algorithm', () => {
    // Helper para criar avaliação base elegível
    const createBaseEvaluation = (overrides: Partial<ABEMIDEvaluation> = {}): ABEMIDEvaluation => ({
        elegibilidade: {
            cuidadorIntegral: true,
            domicilioSeguro: true,
            impedimentoDeslocamento: true,
        },
        suporteTerapeutico: {
            dialise: false,
            traqueostomiaComAspiracao: false,
            traqueostomiaSemAspiracao: false,
            acessoVenosoContínuo: false,
            acessoVenosoIntermitente: false,
            sondaVesicalPermanente: false,
            sondaVesicalIntermitente: false,
            viaOral: false,
            viaSubcutanea: false,
            viaIntravenosa: false,
            aspiracaoViasAereas: false,
        },
        grauDependencia: 'parcial',
        ...overrides,
    });

    describe('Elegibilidade', () => {
        it('deve retornar NAO_ELEGIVEL quando não tem cuidador integral', () => {
            const avaliacao = createBaseEvaluation({
                elegibilidade: {
                    cuidadorIntegral: false,
                    domicilioSeguro: true,
                    impedimentoDeslocamento: true,
                },
            });

            const resultado = calcularABEMID(avaliacao);

            expect(resultado.elegivel).toBe(false);
            expect(resultado.nivel).toBe('NAO_ELEGIVEL');
            expect(resultado.motivoInelegibilidade).toContain('cuidador');
        });

        it('deve retornar NAO_ELEGIVEL quando domicílio não é seguro', () => {
            const avaliacao = createBaseEvaluation({
                elegibilidade: {
                    cuidadorIntegral: true,
                    domicilioSeguro: false,
                    impedimentoDeslocamento: true,
                },
            });

            const resultado = calcularABEMID(avaliacao);

            expect(resultado.elegivel).toBe(false);
            expect(resultado.nivel).toBe('NAO_ELEGIVEL');
            expect(resultado.motivoInelegibilidade).toContain('riscos');
        });

        it('deve retornar NAO_ELEGIVEL quando pode se deslocar', () => {
            const avaliacao = createBaseEvaluation({
                elegibilidade: {
                    cuidadorIntegral: true,
                    domicilioSeguro: true,
                    impedimentoDeslocamento: false,
                },
            });

            const resultado = calcularABEMID(avaliacao);

            expect(resultado.elegivel).toBe(false);
            expect(resultado.nivel).toBe('NAO_ELEGIVEL');
        });
    });

    describe('Classificação por Pontuação', () => {
        it('deve classificar como BAIXA com pontuação 7-12', () => {
            const avaliacao = createBaseEvaluation({
                suporteTerapeutico: {
                    ...createBaseEvaluation().suporteTerapeutico,
                    viaOral: true,           // 1 pt
                    viaSubcutanea: true,     // 2 pts
                    sondaVesicalPermanente: true, // 3 pts = 6 pts
                },
                grauDependencia: 'parcial',  // 3 pts = total 9 pts
            });

            const resultado = calcularABEMID(avaliacao);

            expect(resultado.elegivel).toBe(true);
            expect(resultado.nivel).toBe('BAIXA');
            expect(resultado.horasAssistencia).toBe(6);
        });

        it('deve classificar como MEDIA com pontuação 13-18', () => {
            const avaliacao = createBaseEvaluation({
                suporteTerapeutico: {
                    ...createBaseEvaluation().suporteTerapeutico,
                    sondaVesicalPermanente: true,    // 3 pts
                    acessoVenosoIntermitente: true,  // 3 pts
                    aspiracaoViasAereas: true,       // 3 pts
                    viaIntravenosa: true,            // 3 pts = 12 pts
                },
                grauDependencia: 'parcial',  // 3 pts = total 15 pts
            });

            const resultado = calcularABEMID(avaliacao);

            expect(resultado.elegivel).toBe(true);
            expect(resultado.nivel).toBe('MEDIA');
            expect(resultado.horasAssistencia).toBe(12);
        });

        it('deve classificar como ALTA com pontuação >= 19', () => {
            const avaliacao = createBaseEvaluation({
                suporteTerapeutico: {
                    ...createBaseEvaluation().suporteTerapeutico,
                    dialise: true,                    // 5 pts
                    traqueostomiaComAspiracao: true,  // 5 pts
                    acessoVenosoContínuo: true,       // 5 pts = 15 pts
                },
                grauDependencia: 'total',  // 5 pts = total 20 pts
            });

            const resultado = calcularABEMID(avaliacao);

            expect(resultado.elegivel).toBe(true);
            expect(resultado.nivel).toBe('ALTA');
            expect(resultado.horasAssistencia).toBe(24);
        });
    });

    describe('Regras Especiais de Itens Críticos', () => {
        it('deve classificar como ALTA quando tem 2+ itens críticos (5 pts)', () => {
            const avaliacao = createBaseEvaluation({
                suporteTerapeutico: {
                    ...createBaseEvaluation().suporteTerapeutico,
                    dialise: true,                    // 5 pts - crítico
                    traqueostomiaComAspiracao: true,  // 5 pts - crítico
                },
                grauDependencia: 'independente',  // 1 pt
            });

            const resultado = calcularABEMID(avaliacao);

            expect(resultado.itensCriticos).toBe(2);
            expect(resultado.nivel).toBe('ALTA');
            expect(resultado.horasAssistencia).toBe(24);
        });

        it('deve classificar como MEDIA quando tem 1 item crítico e pontuação < 13', () => {
            const avaliacao = createBaseEvaluation({
                suporteTerapeutico: {
                    ...createBaseEvaluation().suporteTerapeutico,
                    dialise: true,  // 5 pts - crítico
                },
                grauDependencia: 'independente',  // 1 pt = total 6 pts
            });

            const resultado = calcularABEMID(avaliacao);

            expect(resultado.itensCriticos).toBe(1);
            expect(resultado.nivel).toBe('MEDIA');
            expect(resultado.horasAssistencia).toBe(12);
        });
    });

    describe('Cálculo de Pontuação', () => {
        it('deve calcular corretamente a pontuação total', () => {
            const avaliacao = createBaseEvaluation({
                suporteTerapeutico: {
                    ...createBaseEvaluation().suporteTerapeutico,
                    viaOral: true,       // 1 pt
                    viaSubcutanea: true, // 2 pts
                },
                grauDependencia: 'total',  // 5 pts
            });

            const resultado = calcularABEMID(avaliacao);

            expect(resultado.pontuacaoTotal).toBe(8); // 1 + 2 + 5
        });
    });
});
