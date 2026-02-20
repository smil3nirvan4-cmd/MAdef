/**
 * coverage-presets.ts
 *
 * Sistema de presets de cobertura para geração de proposta e contrato.
 * Cada preset define um cenário pré-configurado (1 dia 12h, 1 dia 24h,
 * 1 semana, 15 dias, mensal) que pré-popula automaticamente os campos
 * do modal de configuração e recalcula o valor do período.
 */

import type { PlanningPeriodicity } from './planning-estimator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CoveragePresetKey =
    | '1_DIA_12H'
    | '1_DIA_24H'
    | '1_SEMANA'
    | '15_DIAS'
    | 'MENSAL';

export type HorasCobertura = 12 | 24;

export interface CoveragePreset {
    key: CoveragePresetKey;
    label: string;
    descricao: string;
    /** Quantidade de dias corridos do período */
    diasCorridos: number;
    /** Dias úteis de atendimento dentro do período */
    diasAtivosPadrao: number;
    periodicidade: PlanningPeriodicity;
    horasPadrao: HorasCobertura;
    /**
     * Dias da semana padrão para o preset (vazio = todos os dias).
     * Formato: 'seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'
     */
    diasAtendimentoPadrao: string[];
    /** Se o operador pode alternar entre 12h e 24h */
    permitirAlternarHoras: boolean;
}

export interface CoverageCalcInput {
    preset: CoveragePresetKey;
    horasOverride?: HorasCobertura;
    /** Total semanal do cenário base (do orçamento) */
    baseTotalSemanal: number;
    /** Qtd de plantões base do cenário (do orçamento) */
    basePlantoes: number;
    /** Horas médias por plantão base (do orçamento) */
    baseHorasPorPlantao: number;
    /** Desconto manual em % (0-100) */
    descontoPercent?: number;
}

export interface CoverageCalcOutput {
    presetKey: CoveragePresetKey;
    presetLabel: string;
    diasCorridos: number;
    diasAtivos: number;
    horasDia: HorasCobertura;
    totalPlantoes: number;
    horasTotais: number;
    /** Fator de escala aplicado sobre o cenário base */
    fatorEscala: number;
    /** Valor calculado para o período selecionado */
    valorPeriodo: number;
    /** Estimativa projetada para 30 dias */
    estimativaMensal: number;
    /** Valor unitário por plantão */
    valorPorPlantao: number;
    /** Label descritivo para exibição no PDF */
    periodoLabel: string;
    /** Campos pré-populados para send-options */
    sendOptionsPreFill: {
        periodicidade: PlanningPeriodicity;
        horasCuidadoDia: number;
        diasAtendimento: string[];
        presetCobertura: CoveragePresetKey;
    };
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

const DIAS_UTEIS_SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex'];
const TODOS_OS_DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];

export const COVERAGE_PRESETS: Record<CoveragePresetKey, CoveragePreset> = {
    '1_DIA_12H': {
        key: '1_DIA_12H',
        label: '1 Dia (12h)',
        descricao: 'Plantão avulso — cobertura de 12 horas (diurno ou noturno)',
        diasCorridos: 1,
        diasAtivosPadrao: 1,
        periodicidade: 'DIARIO',
        horasPadrao: 12,
        diasAtendimentoPadrao: [],
        permitirAlternarHoras: false,
    },
    '1_DIA_24H': {
        key: '1_DIA_24H',
        label: '1 Dia (24h)',
        descricao: 'Cobertura integral de 24 horas em um único dia',
        diasCorridos: 1,
        diasAtivosPadrao: 1,
        periodicidade: 'DIARIO',
        horasPadrao: 24,
        diasAtendimentoPadrao: [],
        permitirAlternarHoras: false,
    },
    '1_SEMANA': {
        key: '1_SEMANA',
        label: '1 Semana',
        descricao: 'Cobertura semanal — segunda a sexta (padrão)',
        diasCorridos: 7,
        diasAtivosPadrao: 5,
        periodicidade: 'SEMANAL',
        horasPadrao: 12,
        diasAtendimentoPadrao: [...DIAS_UTEIS_SEMANA],
        permitirAlternarHoras: true,
    },
    '15_DIAS': {
        key: '15_DIAS',
        label: '15 Dias',
        descricao: 'Cobertura quinzenal contínua',
        diasCorridos: 15,
        diasAtivosPadrao: 11,
        periodicidade: 'DIARIO',
        horasPadrao: 12,
        diasAtendimentoPadrao: [...DIAS_UTEIS_SEMANA],
        permitirAlternarHoras: true,
    },
    'MENSAL': {
        key: 'MENSAL',
        label: 'Mensal',
        descricao: 'Cobertura mensal — 30 dias corridos (seg-sex padrão)',
        diasCorridos: 30,
        diasAtivosPadrao: 22,
        periodicidade: 'DIARIO',
        horasPadrao: 12,
        diasAtendimentoPadrao: [...DIAS_UTEIS_SEMANA],
        permitirAlternarHoras: true,
    },
};

export const COVERAGE_PRESET_KEYS: CoveragePresetKey[] = [
    '1_DIA_12H',
    '1_DIA_24H',
    '1_SEMANA',
    '15_DIAS',
    'MENSAL',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Conta os dias úteis (seg-sex) em um intervalo de dias corridos.
 * Se `diasAtendimento` não está vazio, usa-os como filtro.
 */
export function contarDiasAtivos(
    diasCorridos: number,
    diasAtendimento: string[],
    todosOsDias = false,
): number {
    if (todosOsDias || diasAtendimento.length === 0) {
        return diasCorridos;
    }

    // Map dia labels to weekday indexes (0=dom, 1=seg, ...)
    const WEEKDAY_MAP: Record<string, number> = {
        dom: 0, domingo: 0,
        seg: 1, segunda: 1,
        ter: 2, terca: 2, terça: 2,
        qua: 3, quarta: 3,
        qui: 4, quinta: 4,
        sex: 5, sexta: 5,
        sab: 6, sabado: 6, sábado: 6,
    };

    const allowedDays = new Set(
        diasAtendimento
            .map((d) => WEEKDAY_MAP[d.toLowerCase().trim()])
            .filter((d): d is number => d !== undefined),
    );

    if (allowedDays.size === 0) return diasCorridos;

    // Count matching weekdays across the range
    // We start from Monday (weekday 1) as default start
    let count = 0;
    for (let i = 0; i < diasCorridos; i++) {
        // Distribute evenly across week: use modular weekday
        const weekday = ((i % 7) + 1) % 7; // 1=seg, 2=ter... 0=dom
        if (allowedDays.has(weekday)) count++;
    }
    return Math.max(1, count);
}

// ---------------------------------------------------------------------------
// Calculation
// ---------------------------------------------------------------------------

/**
 * Calcula os valores de um preset de cobertura a partir do cenário base.
 *
 * Lógica de escala:
 * ```
 * fatorEscala = (diasAtivos × horasDia) / (basePlantoes × baseHorasPorPlantao)
 * valorPeriodo = baseTotalSemanal × fatorEscala × (1 - desconto%)
 * estimativaMensal = (valorPeriodo / diasAtivos) × 22 dias/mes (úteis)
 * ```
 */
export function calculateCoveragePreset(input: CoverageCalcInput): CoverageCalcOutput {
    const preset = COVERAGE_PRESETS[input.preset];
    if (!preset) {
        throw new Error(`Preset de cobertura desconhecido: ${input.preset}`);
    }

    const horasDia: HorasCobertura = preset.permitirAlternarHoras && input.horasOverride
        ? input.horasOverride
        : preset.horasPadrao;

    const diasAtivos = preset.diasAtivosPadrao;
    const totalPlantoes = diasAtivos;
    const horasTotais = diasAtivos * horasDia;

    // Fator de escala: proporcional ao cenário base
    const baseDenominator = Math.max(1, input.basePlantoes * input.baseHorasPorPlantao);
    const fatorEscala = round2(horasTotais / baseDenominator);

    // Valor do período
    const descontoFator = 1 - ((input.descontoPercent ?? 0) / 100);
    const valorPeriodo = round2(Math.max(0, input.baseTotalSemanal * fatorEscala * descontoFator));

    // Estimativa mensal: projetar proporcionalmente para 22 dias úteis
    const valorPorDia = diasAtivos > 0 ? valorPeriodo / diasAtivos : 0;
    const estimativaMensal = round2(valorPorDia * 22);

    // Valor por plantão
    const valorPorPlantao = totalPlantoes > 0 ? round2(valorPeriodo / totalPlantoes) : 0;

    // Label descritivo
    const periodoLabel = buildPeriodoLabel(preset, horasDia);

    return {
        presetKey: preset.key,
        presetLabel: preset.label,
        diasCorridos: preset.diasCorridos,
        diasAtivos,
        horasDia,
        totalPlantoes,
        horasTotais,
        fatorEscala,
        valorPeriodo,
        estimativaMensal,
        valorPorPlantao,
        periodoLabel,
        sendOptionsPreFill: {
            periodicidade: preset.periodicidade,
            horasCuidadoDia: horasDia,
            diasAtendimento: preset.diasAtendimentoPadrao.length > 0
                ? preset.diasAtendimentoPadrao
                : TODOS_OS_DIAS,
            presetCobertura: preset.key,
        },
    };
}

/**
 * Calcula todos os presets para um cenário, útil para exibir comparativo.
 */
export function calculateAllPresets(
    baseTotalSemanal: number,
    basePlantoes: number,
    baseHorasPorPlantao: number,
    descontoPercent = 0,
): Record<CoveragePresetKey, CoverageCalcOutput> {
    const results = {} as Record<CoveragePresetKey, CoverageCalcOutput>;

    for (const key of COVERAGE_PRESET_KEYS) {
        results[key] = calculateCoveragePreset({
            preset: key,
            baseTotalSemanal,
            basePlantoes,
            baseHorasPorPlantao,
            descontoPercent,
        });
    }

    return results;
}

// ---------------------------------------------------------------------------
// Label builders
// ---------------------------------------------------------------------------

function buildPeriodoLabel(preset: CoveragePreset, horasDia: HorasCobertura): string {
    const horasLabel = horasDia === 24 ? '24h/dia' : '12h/dia';

    switch (preset.key) {
        case '1_DIA_12H':
            return 'Valor para 1 dia (12h)';
        case '1_DIA_24H':
            return 'Valor para 1 dia (24h)';
        case '1_SEMANA':
            return `Valor para 1 semana (${horasLabel}, ${preset.diasAtivosPadrao} dias)`;
        case '15_DIAS':
            return `Valor para 15 dias (${horasLabel}, ${preset.diasAtivosPadrao} dias úteis)`;
        case 'MENSAL':
            return `Valor mensal (${horasLabel}, ${preset.diasAtivosPadrao} dias úteis)`;
        default:
            return `Valor do período (${horasLabel})`;
    }
}

/**
 * Retorna uma string curta para exibição em PDF e WhatsApp.
 */
export function getPresetShortLabel(key: CoveragePresetKey, horasDia: HorasCobertura = 12): string {
    const preset = COVERAGE_PRESETS[key];
    if (!preset) return key;

    const horasLabel = horasDia === 24 ? '24h/dia' : '12h/dia';
    return `${preset.label} — ${horasLabel}`;
}
