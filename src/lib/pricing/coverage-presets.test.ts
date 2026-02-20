import { describe, expect, it } from 'vitest';
import {
    calculateCoveragePreset,
    calculateAllPresets,
    getPresetShortLabel,
    COVERAGE_PRESETS,
    COVERAGE_PRESET_KEYS,
    type CoverageCalcInput,
} from './coverage-presets';

const BASE_SEMANAL = 3909.67;
const BASE_PLANTOES = 11;
const BASE_HORAS = 12;

function makeInput(preset: CoverageCalcInput['preset'], overrides?: Partial<CoverageCalcInput>): CoverageCalcInput {
    return {
        preset,
        baseTotalSemanal: BASE_SEMANAL,
        basePlantoes: BASE_PLANTOES,
        baseHorasPorPlantao: BASE_HORAS,
        ...overrides,
    };
}

describe('coverage-presets', () => {
    describe('COVERAGE_PRESETS registry', () => {
        it('contains exactly 5 presets', () => {
            expect(COVERAGE_PRESET_KEYS).toHaveLength(5);
            expect(Object.keys(COVERAGE_PRESETS)).toHaveLength(5);
        });

        it('each preset has required fields', () => {
            for (const key of COVERAGE_PRESET_KEYS) {
                const preset = COVERAGE_PRESETS[key];
                expect(preset.key).toBe(key);
                expect(preset.label).toBeTruthy();
                expect(preset.descricao).toBeTruthy();
                expect(preset.diasCorridos).toBeGreaterThan(0);
                expect(preset.diasAtivosPadrao).toBeGreaterThan(0);
                expect([12, 24]).toContain(preset.horasPadrao);
            }
        });
    });

    describe('calculateCoveragePreset', () => {
        it('1_DIA_12H produces correct fraction of weekly base', () => {
            const result = calculateCoveragePreset(makeInput('1_DIA_12H'));
            expect(result.diasAtivos).toBe(1);
            expect(result.horasDia).toBe(12);
            expect(result.totalPlantoes).toBe(1);
            expect(result.horasTotais).toBe(12);
            // fator = 12 / (11 * 12) = 0.09
            expect(result.fatorEscala).toBeCloseTo(0.09, 2);
            expect(result.valorPeriodo).toBeGreaterThan(0);
            expect(result.valorPeriodo).toBeLessThan(BASE_SEMANAL);
        });

        it('1_DIA_24H is approximately 2x the value of 1_DIA_12H', () => {
            const r12 = calculateCoveragePreset(makeInput('1_DIA_12H'));
            const r24 = calculateCoveragePreset(makeInput('1_DIA_24H'));
            expect(r24.horasDia).toBe(24);
            expect(r24.horasTotais).toBe(24);
            // 24h should be ~2x of 12h
            const ratio = r24.valorPeriodo / r12.valorPeriodo;
            expect(ratio).toBeCloseTo(2, 1);
        });

        it('1_SEMANA with 12h produces 5 dias ativos', () => {
            const result = calculateCoveragePreset(makeInput('1_SEMANA'));
            expect(result.diasAtivos).toBe(5);
            expect(result.horasDia).toBe(12);
            expect(result.totalPlantoes).toBe(5);
            expect(result.horasTotais).toBe(60);
        });

        it('1_SEMANA with 24h override doubles the value', () => {
            const r12 = calculateCoveragePreset(makeInput('1_SEMANA'));
            const r24 = calculateCoveragePreset(makeInput('1_SEMANA', { horasOverride: 24 }));
            expect(r24.horasDia).toBe(24);
            const ratio = r24.valorPeriodo / r12.valorPeriodo;
            expect(ratio).toBeCloseTo(2, 1);
        });

        it('15_DIAS produces 11 dias ativos', () => {
            const result = calculateCoveragePreset(makeInput('15_DIAS'));
            expect(result.diasAtivos).toBe(11);
            expect(result.horasTotais).toBe(11 * 12);
        });

        it('MENSAL produces 22 dias ativos and highest value', () => {
            const result = calculateCoveragePreset(makeInput('MENSAL'));
            expect(result.diasAtivos).toBe(22);
            expect(result.horasTotais).toBe(22 * 12);
            expect(result.valorPeriodo).toBeGreaterThan(
                calculateCoveragePreset(makeInput('1_SEMANA')).valorPeriodo,
            );
        });

        it('estimativaMensal is consistent: 22 days projection', () => {
            const result = calculateCoveragePreset(makeInput('1_DIA_12H'));
            const expectedMensal = (result.valorPeriodo / result.diasAtivos) * 22;
            expect(result.estimativaMensal).toBeCloseTo(expectedMensal, 0);
        });

        it('applies desconto percent correctly', () => {
            const semDesconto = calculateCoveragePreset(makeInput('1_SEMANA'));
            const comDesconto = calculateCoveragePreset(makeInput('1_SEMANA', { descontoPercent: 10 }));
            expect(comDesconto.valorPeriodo).toBeCloseTo(semDesconto.valorPeriodo * 0.9, 0);
        });

        it('valorPorPlantao is totalPeriodo / totalPlantoes', () => {
            const result = calculateCoveragePreset(makeInput('1_SEMANA'));
            expect(result.valorPorPlantao).toBeCloseTo(result.valorPeriodo / result.totalPlantoes, 2);
        });

        it('throws on unknown preset', () => {
            expect(() => calculateCoveragePreset(
                makeInput('INVALIDO' as CoverageCalcInput['preset']),
            )).toThrow('Preset de cobertura desconhecido');
        });

        it('sendOptionsPreFill contains correct fields', () => {
            const result = calculateCoveragePreset(makeInput('MENSAL'));
            expect(result.sendOptionsPreFill.periodicidade).toBe('DIARIO');
            expect(result.sendOptionsPreFill.horasCuidadoDia).toBe(12);
            expect(result.sendOptionsPreFill.presetCobertura).toBe('MENSAL');
            expect(result.sendOptionsPreFill.diasAtendimento).toEqual(
                expect.arrayContaining(['seg', 'ter', 'qua', 'qui', 'sex']),
            );
        });
    });

    describe('calculateAllPresets', () => {
        it('returns all 5 preset outputs', () => {
            const results = calculateAllPresets(BASE_SEMANAL, BASE_PLANTOES, BASE_HORAS);
            expect(Object.keys(results)).toHaveLength(5);
            for (const key of COVERAGE_PRESET_KEYS) {
                expect(results[key]).toBeDefined();
                expect(results[key].presetKey).toBe(key);
            }
        });

        it('values are ordered: 1dia < 1semana < 15dias < mensal', () => {
            const r = calculateAllPresets(BASE_SEMANAL, BASE_PLANTOES, BASE_HORAS);
            expect(r['1_DIA_12H'].valorPeriodo).toBeLessThan(r['1_SEMANA'].valorPeriodo);
            expect(r['1_SEMANA'].valorPeriodo).toBeLessThan(r['15_DIAS'].valorPeriodo);
            expect(r['15_DIAS'].valorPeriodo).toBeLessThan(r['MENSAL'].valorPeriodo);
        });
    });

    describe('getPresetShortLabel', () => {
        it('returns readable label for each preset', () => {
            for (const key of COVERAGE_PRESET_KEYS) {
                const label = getPresetShortLabel(key);
                expect(label).toBeTruthy();
                expect(label.length).toBeGreaterThan(5);
            }
        });

        it('includes 24h/dia when horas is 24', () => {
            const label = getPresetShortLabel('1_SEMANA', 24);
            expect(label).toContain('24h/dia');
        });
    });
});
