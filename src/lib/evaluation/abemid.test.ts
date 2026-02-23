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

    describe('Boundary Conditions', () => {
        it('all suporte items false with independente yields minimum score (1)', () => {
            const avaliacao = createBaseEvaluation({
                grauDependencia: 'independente', // 1 pt, 0 suporte
            });

            const resultado = calcularABEMID(avaliacao);

            expect(resultado.pontuacaoTotal).toBe(1);
            expect(resultado.nivel).toBe('NAO_ELEGIVEL'); // < 7
            expect(resultado.elegivel).toBe(false);
        });

        it('all suporte items true with total dependency yields maximum score', () => {
            const avaliacao = createBaseEvaluation({
                suporteTerapeutico: {
                    dialise: true,                    // 5
                    traqueostomiaComAspiracao: true,  // 5
                    traqueostomiaSemAspiracao: true,   // 3
                    acessoVenosoContínuo: true,        // 5
                    acessoVenosoIntermitente: true,     // 3
                    sondaVesicalPermanente: true,       // 3
                    sondaVesicalIntermitente: true,     // 3
                    viaOral: true,                      // 1
                    viaSubcutanea: true,                // 2
                    viaIntravenosa: true,               // 3
                    aspiracaoViasAereas: true,          // 3
                },
                grauDependencia: 'total', // 5
            });

            const resultado = calcularABEMID(avaliacao);

            // 5+5+3+5+3+3+3+1+2+3+3 = 36, + 5 = 41
            expect(resultado.pontuacaoTotal).toBe(41);
            expect(resultado.nivel).toBe('ALTA');
            expect(resultado.horasAssistencia).toBe(24);
            expect(resultado.itensCriticos).toBe(3); // dialise, traqueo, acesso venoso continuo
        });

        it('score exactly 7 is classified as BAIXA', () => {
            // Need suporte = 4 + grau parcial = 3 => total 7
            const avaliacao = createBaseEvaluation({
                suporteTerapeutico: {
                    ...createBaseEvaluation().suporteTerapeutico,
                    viaOral: true,        // 1
                    viaIntravenosa: true,  // 3
                },
                grauDependencia: 'parcial', // 3 => total = 7
            });

            const resultado = calcularABEMID(avaliacao);

            expect(resultado.pontuacaoTotal).toBe(7);
            expect(resultado.nivel).toBe('BAIXA');
            expect(resultado.horasAssistencia).toBe(6);
        });

        it('score exactly 6 (below threshold) is NAO_ELEGIVEL', () => {
            // suporte = 1 + grau total = 5 => total = 6
            const avaliacao = createBaseEvaluation({
                suporteTerapeutico: {
                    ...createBaseEvaluation().suporteTerapeutico,
                    viaOral: true, // 1
                },
                grauDependencia: 'total', // 5 => total = 6
            });

            const resultado = calcularABEMID(avaliacao);

            expect(resultado.pontuacaoTotal).toBe(6);
            expect(resultado.nivel).toBe('NAO_ELEGIVEL');
            expect(resultado.elegivel).toBe(false);
        });

        it('score exactly 12 is BAIXA (upper boundary)', () => {
            // suporte = 9 + parcial = 3 => total = 12
            const avaliacao = createBaseEvaluation({
                suporteTerapeutico: {
                    ...createBaseEvaluation().suporteTerapeutico,
                    sondaVesicalPermanente: true,    // 3
                    acessoVenosoIntermitente: true,   // 3
                    aspiracaoViasAereas: true,        // 3
                },
                grauDependencia: 'parcial', // 3 => total = 12
            });

            const resultado = calcularABEMID(avaliacao);

            expect(resultado.pontuacaoTotal).toBe(12);
            expect(resultado.nivel).toBe('BAIXA');
            expect(resultado.horasAssistencia).toBe(6);
        });

        it('score exactly 13 is MEDIA (lower boundary)', () => {
            // suporte = 12 + independente = 1 => total = 13
            const avaliacao = createBaseEvaluation({
                suporteTerapeutico: {
                    ...createBaseEvaluation().suporteTerapeutico,
                    sondaVesicalPermanente: true,    // 3
                    acessoVenosoIntermitente: true,   // 3
                    aspiracaoViasAereas: true,        // 3
                    viaIntravenosa: true,              // 3
                },
                grauDependencia: 'independente', // 1 => total = 13
            });

            const resultado = calcularABEMID(avaliacao);

            expect(resultado.pontuacaoTotal).toBe(13);
            expect(resultado.nivel).toBe('MEDIA');
            expect(resultado.horasAssistencia).toBe(12);
        });

        it('score exactly 18 is MEDIA (upper boundary)', () => {
            // suporte = 15 + parcial = 3 => total = 18
            const avaliacao = createBaseEvaluation({
                suporteTerapeutico: {
                    ...createBaseEvaluation().suporteTerapeutico,
                    sondaVesicalPermanente: true,     // 3
                    sondaVesicalIntermitente: true,    // 3
                    acessoVenosoIntermitente: true,    // 3
                    aspiracaoViasAereas: true,         // 3
                    viaIntravenosa: true,               // 3
                },
                grauDependencia: 'parcial', // 3 => total = 18
            });

            const resultado = calcularABEMID(avaliacao);

            expect(resultado.pontuacaoTotal).toBe(18);
            expect(resultado.nivel).toBe('MEDIA');
            expect(resultado.horasAssistencia).toBe(12);
        });

        it('score exactly 19 is ALTA (lower boundary)', () => {
            // suporte = 18 + independente = 1 => total = 19
            const avaliacao = createBaseEvaluation({
                suporteTerapeutico: {
                    ...createBaseEvaluation().suporteTerapeutico,
                    sondaVesicalPermanente: true,     // 3
                    sondaVesicalIntermitente: true,    // 3
                    acessoVenosoIntermitente: true,    // 3
                    aspiracaoViasAereas: true,         // 3
                    viaIntravenosa: true,               // 3
                    traqueostomiaSemAspiracao: true,    // 3
                },
                grauDependencia: 'independente', // 1 => total = 19
            });

            const resultado = calcularABEMID(avaliacao);

            expect(resultado.pontuacaoTotal).toBe(19);
            expect(resultado.nivel).toBe('ALTA');
            expect(resultado.horasAssistencia).toBe(24);
        });
    });

    describe('Critical items special rules', () => {
        it('1 critical item with score >= 13 uses normal classification', () => {
            // 1 critical (dialise=5) + suporte extras + parcial => total >= 13
            const avaliacao = createBaseEvaluation({
                suporteTerapeutico: {
                    ...createBaseEvaluation().suporteTerapeutico,
                    dialise: true,                    // 5 (critical)
                    sondaVesicalPermanente: true,     // 3
                    aspiracaoViasAereas: true,        // 3
                },
                grauDependencia: 'parcial', // 3 => total = 14
            });

            const resultado = calcularABEMID(avaliacao);

            expect(resultado.itensCriticos).toBe(1);
            expect(resultado.pontuacaoTotal).toBe(14);
            // Since score >= 13 and only 1 critical, the special rule does NOT apply
            // Normal rule: 13-18 => MEDIA
            expect(resultado.nivel).toBe('MEDIA');
            expect(resultado.horasAssistencia).toBe(12);
        });

        it('3 critical items automatically classify as ALTA', () => {
            const avaliacao = createBaseEvaluation({
                suporteTerapeutico: {
                    ...createBaseEvaluation().suporteTerapeutico,
                    dialise: true,                    // 5 - critical
                    traqueostomiaComAspiracao: true,  // 5 - critical
                    acessoVenosoContínuo: true,       // 5 - critical
                },
                grauDependencia: 'independente', // 1
            });

            const resultado = calcularABEMID(avaliacao);

            expect(resultado.itensCriticos).toBe(3);
            expect(resultado.nivel).toBe('ALTA');
            expect(resultado.horasAssistencia).toBe(24);
        });

        it('zero critical items uses normal pontuacao rules', () => {
            const avaliacao = createBaseEvaluation({
                suporteTerapeutico: {
                    ...createBaseEvaluation().suporteTerapeutico,
                    viaOral: true,         // 1
                    viaSubcutanea: true,   // 2
                    viaIntravenosa: true,   // 3
                },
                grauDependencia: 'parcial', // 3 => total = 9
            });

            const resultado = calcularABEMID(avaliacao);

            expect(resultado.itensCriticos).toBe(0);
            expect(resultado.nivel).toBe('BAIXA');
        });
    });

    describe('All eligibility combinations', () => {
        it('all three eligibility criteria false returns first failure message', () => {
            const avaliacao = createBaseEvaluation({
                elegibilidade: {
                    cuidadorIntegral: false,
                    domicilioSeguro: false,
                    impedimentoDeslocamento: false,
                },
            });

            const resultado = calcularABEMID(avaliacao);

            expect(resultado.elegivel).toBe(false);
            // First check is cuidadorIntegral
            expect(resultado.motivoInelegibilidade).toContain('cuidador');
        });

        it('eligible evaluation always has elegivel=true and no motivo', () => {
            const avaliacao = createBaseEvaluation({
                suporteTerapeutico: {
                    ...createBaseEvaluation().suporteTerapeutico,
                    sondaVesicalPermanente: true, // 3
                    viaIntravenosa: true,           // 3
                },
                grauDependencia: 'parcial', // 3 => total = 9 => BAIXA
            });

            const resultado = calcularABEMID(avaliacao);

            expect(resultado.elegivel).toBe(true);
            expect(resultado.motivoInelegibilidade).toBeUndefined();
        });

        it('non-eligible evaluation always returns zero pontuacao', () => {
            const avaliacao = createBaseEvaluation({
                elegibilidade: {
                    cuidadorIntegral: false,
                    domicilioSeguro: true,
                    impedimentoDeslocamento: true,
                },
                suporteTerapeutico: {
                    ...createBaseEvaluation().suporteTerapeutico,
                    dialise: true,
                    traqueostomiaComAspiracao: true,
                },
                grauDependencia: 'total',
            });

            const resultado = calcularABEMID(avaliacao);

            expect(resultado.pontuacaoTotal).toBe(0);
            expect(resultado.itensCriticos).toBe(0);
            expect(resultado.horasAssistencia).toBe(0);
        });
    });

    describe('Dependency grades', () => {
        it('independente adds 1 point', () => {
            const avaliacao = createBaseEvaluation({ grauDependencia: 'independente' });
            const resultado = calcularABEMID(avaliacao);
            expect(resultado.pontuacaoTotal).toBe(1);
        });

        it('parcial adds 3 points', () => {
            const avaliacao = createBaseEvaluation({ grauDependencia: 'parcial' });
            const resultado = calcularABEMID(avaliacao);
            expect(resultado.pontuacaoTotal).toBe(3);
        });

        it('total adds 5 points', () => {
            const avaliacao = createBaseEvaluation({ grauDependencia: 'total' });
            const resultado = calcularABEMID(avaliacao);
            expect(resultado.pontuacaoTotal).toBe(5);
        });
    });
});
