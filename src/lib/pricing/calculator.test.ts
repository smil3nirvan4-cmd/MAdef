import { describe, it, expect } from 'vitest';
import { calcularOrcamento, calcularOrcamentoCenarios, OrcamentoInput } from './calculator';

describe('Pricing Calculator', () => {
    const createBaseInput = (overrides: Partial<OrcamentoInput> = {}): OrcamentoInput => ({
        tipoProfissional: 'CUIDADOR',
        complexidade: 'BAIXA',
        horasDiarias: 12,
        duracaoDias: 7,
        incluirNoturno: false,
        feriados: 0,
        ...overrides,
    });

    describe('calcularOrcamento', () => {
        it('deve calcular orçamento básico corretamente', () => {
            const input = createBaseInput();
            const resultado = calcularOrcamento(input);

            expect(resultado.valorHora).toBeGreaterThan(0);
            expect(resultado.horasTotais).toBe(84); // 12h * 7 dias
            expect(resultado.total).toBeGreaterThan(resultado.subtotal);
        });

        it('deve aplicar taxa administrativa de 20%', () => {
            const input = createBaseInput();
            const resultado = calcularOrcamento(input);

            // Taxa = 20% do subtotal ajustado
            expect(resultado.taxaAdministrativa).toBeGreaterThan(0);
        });

        it('deve lançar erro para paciente NAO_ELEGIVEL', () => {
            const input = createBaseInput({ complexidade: 'NAO_ELEGIVEL' });

            expect(() => calcularOrcamento(input)).toThrow('não elegível');
        });

        it('deve calcular adicional noturno para plantão 24h', () => {
            const input = createBaseInput({ horasDiarias: 24 });
            const resultado = calcularOrcamento(input);

            expect(resultado.adicionalNoturno).toBeGreaterThan(0);
            expect(resultado.horasTotais).toBe(168); // 24h * 7 dias
        });

        it('deve calcular adicional de feriado corretamente', () => {
            const input = createBaseInput({ feriados: 2 });
            const resultado = calcularOrcamento(input);

            expect(resultado.adicionalFeriado).toBeGreaterThan(0);
        });

        it('deve aplicar multiplicador de complexidade MEDIA (1.25x)', () => {
            const inputBaixa = createBaseInput({ complexidade: 'BAIXA' });
            const inputMedia = createBaseInput({ complexidade: 'MEDIA' });

            const resultadoBaixa = calcularOrcamento(inputBaixa);
            const resultadoMedia = calcularOrcamento(inputMedia);

            expect(resultadoMedia.adicionalComplexidade).toBeGreaterThan(0);
            expect(resultadoMedia.total).toBeGreaterThan(resultadoBaixa.total);
        });

        it('deve aplicar multiplicador de complexidade ALTA (1.5x)', () => {
            const inputBaixa = createBaseInput({ complexidade: 'BAIXA' });
            const inputAlta = createBaseInput({ complexidade: 'ALTA' });

            const resultadoBaixa = calcularOrcamento(inputBaixa);
            const resultadoAlta = calcularOrcamento(inputAlta);

            expect(resultadoAlta.adicionalComplexidade).toBeGreaterThan(0);
            expect(resultadoAlta.total).toBeGreaterThan(resultadoBaixa.total);
        });

        it('deve calcular demanda de equipe para duração > 4 dias', () => {
            const inputCurto = createBaseInput({ duracaoDias: 3 });
            const inputLongo = createBaseInput({ duracaoDias: 7 });

            const resultadoCurto = calcularOrcamento(inputCurto);
            const resultadoLongo = calcularOrcamento(inputLongo);

            expect(resultadoCurto.demandaEquipe).toBe(false);
            expect(resultadoLongo.demandaEquipe).toBe(true);
        });

        it('deve calcular parcelamento com entrada de 30%', () => {
            const input = createBaseInput();
            const resultado = calcularOrcamento(input);

            expect(resultado.parcelamento.entrada).toBeCloseTo(resultado.total * 0.3, 1);
            expect(resultado.parcelamento.quantidadeParcelas).toBeGreaterThanOrEqual(1);
            expect(resultado.parcelamento.valorParcela).toBeGreaterThan(0);
        });

        it('deve gerar detalhamento com descrições', () => {
            const input = createBaseInput();
            const resultado = calcularOrcamento(input);

            expect(resultado.detalhamento.length).toBeGreaterThan(0);
            expect(resultado.detalhamento[0]).toHaveProperty('descricao');
            expect(resultado.detalhamento[0]).toHaveProperty('valor');
        });
    });

    describe('calcularOrcamentoCenarios', () => {
        it('deve gerar 3 cenários', () => {
            const input = createBaseInput({ tipoProfissional: 'AUXILIAR_ENF' });
            const cenarios = calcularOrcamentoCenarios(input);

            expect(cenarios).toHaveProperty('economico');
            expect(cenarios).toHaveProperty('recomendado');
            expect(cenarios).toHaveProperty('premium');
        });

        it('deve ter preços em ordem: economico < recomendado < premium', () => {
            const input = createBaseInput({ tipoProfissional: 'AUXILIAR_ENF' });
            const cenarios = calcularOrcamentoCenarios(input);

            expect(cenarios.economico.total).toBeLessThan(cenarios.recomendado.total);
            expect(cenarios.recomendado.total).toBeLessThan(cenarios.premium.total);
        });

        it('cenário premium deve incluir supervisão de enfermagem', () => {
            const input = createBaseInput({ tipoProfissional: 'CUIDADOR' });
            const cenarios = calcularOrcamentoCenarios(input);

            const supervisaoItem = cenarios.premium.detalhamento.find(
                (item: { descricao: string; valor: number }) => item.descricao.includes('Supervisão')
            );

            expect(supervisaoItem).toBeDefined();
            expect(supervisaoItem?.valor).toBe(600);
        });

        it('cenário econômico deve usar profissional de nível inferior', () => {
            const input = createBaseInput({ tipoProfissional: 'TECNICO_ENF' });
            const cenarios = calcularOrcamentoCenarios(input);

            // Econômico usa AUXILIAR_ENF (mais barato que TECNICO_ENF)
            expect(cenarios.economico.valorHora).toBeLessThan(cenarios.recomendado.valorHora);
        });
    });

    describe('Tabela de Preços por Profissional', () => {
        it('CUIDADOR deve ter menor valor hora que AUXILIAR_ENF', () => {
            const inputCuidador = createBaseInput({ tipoProfissional: 'CUIDADOR' });
            const inputAuxiliar = createBaseInput({ tipoProfissional: 'AUXILIAR_ENF' });

            const resultadoCuidador = calcularOrcamento(inputCuidador);
            const resultadoAuxiliar = calcularOrcamento(inputAuxiliar);

            expect(resultadoCuidador.valorHora).toBeLessThan(resultadoAuxiliar.valorHora);
        });

        it('AUXILIAR_ENF deve ter menor valor hora que TECNICO_ENF', () => {
            const inputAuxiliar = createBaseInput({ tipoProfissional: 'AUXILIAR_ENF' });
            const inputTecnico = createBaseInput({ tipoProfissional: 'TECNICO_ENF' });

            const resultadoAuxiliar = calcularOrcamento(inputAuxiliar);
            const resultadoTecnico = calcularOrcamento(inputTecnico);

            expect(resultadoAuxiliar.valorHora).toBeLessThan(resultadoTecnico.valorHora);
        });
    });
});
