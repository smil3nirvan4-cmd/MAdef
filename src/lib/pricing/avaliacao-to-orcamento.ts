import type { OrcamentoInput } from './calculator';
import type {
    PricingCalculationInput,
    PricingProfessional,
} from './enterprise-engine';

type Complexidade = 'BAIXA' | 'MEDIA' | 'ALTA';
type TipoProfissional = 'CUIDADOR' | 'AUXILIAR_ENF' | 'TECNICO_ENF';
type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord {
    return value && typeof value === 'object' ? (value as AnyRecord) : {};
}

function asNumber(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function parseDetalhes(avaliacao: AnyRecord): AnyRecord {
    const raw = avaliacao.dadosDetalhados;
    if (typeof raw !== 'string' || !raw.trim()) return {};
    try {
        return asRecord(JSON.parse(raw));
    } catch {
        return {};
    }
}

function extractKatzScore(avaliacao: AnyRecord, detalhes: AnyRecord): number | null {
    const direto = asNumber(avaliacao.katzScore);
    if (direto !== null) return direto;

    const katz = asRecord(detalhes.katz);
    const keys = ['banho', 'vestir', 'higiene', 'transferencia', 'continencia', 'alimentacao'];
    const score = keys.reduce((acc, key) => {
        const value = String(katz[key] ?? '').toLowerCase();
        return acc + (value.includes('independente') ? 1 : 0);
    }, 0);

    return score > 0 ? score : null;
}

function extractLawtonScore(avaliacao: AnyRecord, detalhes: AnyRecord): number | null {
    const direto = asNumber(avaliacao.lawtonScore);
    if (direto !== null) return direto;

    const lawton = asRecord(detalhes.lawton);
    const values = Object.values(lawton).map((value) => asNumber(value)).filter((value): value is number => value !== null);
    if (!values.length) return null;

    // Escala simplificada: >=2 indica maior independência naquele item.
    return values.reduce((acc, current) => acc + (current >= 2 ? 1 : 0), 0);
}

function inferirComplexidade(avaliacao: AnyRecord, detalhes: AnyRecord): Complexidade {
    const abemid = asNumber(avaliacao.abemidScore);
    const katz = extractKatzScore(avaliacao, detalhes);
    const lawton = extractLawtonScore(avaliacao, detalhes);

    let severidade = 1; // 1=BAIXA 2=MEDIA 3=ALTA

    if (abemid !== null) {
        if (abemid >= 6) severidade = Math.max(severidade, 3);
        else if (abemid >= 3) severidade = Math.max(severidade, 2);
    }

    if (katz !== null) {
        if (katz <= 3) severidade = Math.max(severidade, 3);
        else if (katz <= 5) severidade = Math.max(severidade, 2);
    }

    if (lawton !== null) {
        if (lawton <= 4) severidade = Math.max(severidade, 3);
        else if (lawton <= 6) severidade = Math.max(severidade, 2);
    }

    const condicoes = asRecord(asRecord(detalhes.clinical).condicoes);
    const quantidadeCondicoes = Object.values(condicoes).reduce<number>((acc, value) => {
        if (Array.isArray(value)) return acc + value.length;
        if (typeof value === 'string' && value.trim()) return acc + 1;
        return acc;
    }, 0);
    if (quantidadeCondicoes >= 8) {
        severidade = Math.max(severidade, 3);
    } else if (quantidadeCondicoes >= 4) {
        severidade = Math.max(severidade, 2);
    }

    if (severidade >= 3) return 'ALTA';
    if (severidade === 2) return 'MEDIA';
    return 'BAIXA';
}

function inferirTipoProfissional(complexidade: Complexidade): TipoProfissional {
    if (complexidade === 'ALTA') return 'TECNICO_ENF';
    if (complexidade === 'MEDIA') return 'AUXILIAR_ENF';
    return 'CUIDADOR';
}

function inferirQuantidadePacientes(avaliacao: AnyRecord, detalhes: AnyRecord): number {
    const discovery = asRecord(detalhes.discovery);
    const orcamento = asRecord(detalhes.orcamento);
    const patient = asRecord(detalhes.patient);

    const candidates = [
        avaliacao.quantidadePacientes,
        discovery.quantidadePacientes,
        discovery.numeroPacientes,
        orcamento.quantidadePacientes,
        orcamento.numeroPacientes,
        patient.quantidadePacientes,
        patient.numeroPacientes,
    ];

    for (const candidate of candidates) {
        const value = asNumber(candidate);
        if (value && value > 0) return Math.max(1, Math.round(value));
    }

    return 1;
}

function inferirDuracaoDias(detalhes: AnyRecord): number {
    const orcamento = asRecord(detalhes.orcamento);
    const direto = asNumber(orcamento.duracaoDias);
    if (direto && direto >= 1 && direto <= 365) return direto;
    return 30;
}

function inferirHorasDiarias(avaliacao: AnyRecord, detalhes: AnyRecord): number {
    const cargaFinal = String(avaliacao.cargaFinal ?? '');
    const cargaSugerida = String(avaliacao.cargaSugerida ?? '');
    const texto = `${cargaFinal} ${cargaSugerida}`.toLowerCase();
    if (texto.includes('24')) return 24;
    if (texto.includes('12')) return 12;
    if (texto.includes('6')) return 6;

    const orcamento = asRecord(detalhes.orcamento);
    const horasTotais = asNumber(orcamento.horasTotais);
    const duracao = inferirDuracaoDias(detalhes);
    if (horasTotais && duracao > 0) {
        const horasDia = Math.round(horasTotais / duracao);
        if (horasDia >= 24) return 24;
        if (horasDia >= 12) return 12;
        if (horasDia >= 6) return 6;
    }

    const cobertura = String(avaliacao.cobertura ?? asRecord(detalhes.discovery).cobertura ?? '').toLowerCase();
    if (cobertura.includes('24')) return 24;
    if (cobertura.includes('12') || cobertura.includes('noturno')) return 12;

    return 12;
}

function inferirMetodoPagamento(detalhes: AnyRecord): string {
    const orcamento = asRecord(detalhes.orcamento);
    const methodRaw = String(orcamento.metodoPagamento ?? orcamento.metodo ?? 'PIX')
        .trim()
        .toUpperCase();

    if (!methodRaw) return 'PIX';
    return methodRaw;
}

function inferirPeriodoPagamento(detalhes: AnyRecord): string {
    const orcamento = asRecord(detalhes.orcamento);
    const periodRaw = String(orcamento.periodo ?? orcamento.periodoPagamento ?? 'SEMANAL')
        .trim()
        .toUpperCase();

    if (!periodRaw) return 'SEMANAL';
    return periodRaw;
}

function inferirDescontoPresetPercent(detalhes: AnyRecord): number | undefined {
    const orcamento = asRecord(detalhes.orcamento);
    const value = asNumber(orcamento.descontoPresetPercent);
    return value !== null && value >= 0 ? value : undefined;
}

function inferirDescontoManualPercent(detalhes: AnyRecord): number | undefined {
    const orcamento = asRecord(detalhes.orcamento);
    const value = asNumber(orcamento.descontoManualPercent);
    return value !== null && value >= 0 ? value : undefined;
}

function inferirMinicustosOverrides(detalhes: AnyRecord): Record<string, boolean> | undefined {
    const orcamento = asRecord(detalhes.orcamento);
    const raw = orcamento.minicustosDesativados;
    if (!raw) return undefined;

    const list = Array.isArray(raw)
        ? raw
        : typeof raw === 'string'
            ? raw.split(',').map((item) => item.trim()).filter(Boolean)
            : [];

    if (!list.length) return undefined;

    const overrides: Record<string, boolean> = {};
    for (const item of list) {
        overrides[String(item).toUpperCase()] = false;
    }
    return Object.keys(overrides).length ? overrides : undefined;
}

function collectConditionTexts(value: unknown): string[] {
    if (typeof value === 'string') {
        return value.trim() ? [value.trim()] : [];
    }
    if (Array.isArray(value)) {
        return value.flatMap((item) => collectConditionTexts(item));
    }
    if (value && typeof value === 'object') {
        return Object.values(value as AnyRecord).flatMap((item) => collectConditionTexts(item));
    }
    return [];
}

function inferirDoencasCodes(detalhes: AnyRecord): string[] {
    const clinical = asRecord(detalhes.clinical);
    const condicoes = asRecord(clinical.condicoes);
    const text = collectConditionTexts(condicoes).join(' ').toLowerCase();
    if (!text.trim()) return [];

    const codes = new Set<string>();
    if (text.includes('alzheimer')) codes.add('ALZHEIMER');
    if (text.includes('parkinson')) codes.add('PARKINSON');
    if (text.includes('demencia') || text.includes('demência')) codes.add('DEMENCIA');
    if (text.includes('avc')) codes.add('AVC_SEQUELA');

    return [...codes];
}

function mapTipoProfissionalToEnterprise(value: TipoProfissional): PricingProfessional {
    return value;
}

function buildEnterpriseFlags(
    avaliacao: AnyRecord,
    horasDiarias: number,
    complexidade: Complexidade,
): PricingCalculationInput['flags'] {
    const texto = `${String(avaliacao.cargaSugerida ?? '')} ${String(avaliacao.cargaFinal ?? '')}`.toLowerCase();
    const hasFimSemana = texto.includes('fds') || texto.includes('fim de semana') || horasDiarias >= 24;

    return {
        noturno: horasDiarias >= 12,
        fimSemana: hasFimSemana,
        feriado: false,
        altoRisco: complexidade === 'ALTA',
        adicionalAT: false,
        adicionalAA: false,
    };
}

export interface AvaliacaoToOrcamentoResult {
    inputEconomico: OrcamentoInput;
    inputRecomendado: OrcamentoInput;
    inputPremium: OrcamentoInput;
    metadados: {
        complexidadeInferida: Complexidade;
        tipoProfissionalInferido: TipoProfissional;
        horasDiariasInferidas: number;
        avisos: string[];
    };
}

export interface AvaliacaoToEnterprisePricingResult {
    inputEconomico: PricingCalculationInput;
    inputRecomendado: PricingCalculationInput;
    inputPremium: PricingCalculationInput;
    metadados: {
        complexidadeInferida: Complexidade;
        tipoProfissionalInferido: TipoProfissional;
        horasDiariasInferidas: number;
        quantidadePacientesInferida: number;
        doencasInferidas: string[];
        avisos: string[];
    };
}

export function avaliacaoToOrcamentoInputs(avaliacao: AnyRecord): AvaliacaoToOrcamentoResult {
    const detalhes = parseDetalhes(avaliacao);
    const avisos: string[] = [];

    if (asNumber(avaliacao.abemidScore) === null) {
        avisos.push('Score ABEMID ausente no registro principal, usando fallback de dados detalhados.');
    }
    if (extractKatzScore(avaliacao, detalhes) === null) {
        avisos.push('Score Katz ausente, inferencia pode ficar menos precisa.');
    }
    if (extractLawtonScore(avaliacao, detalhes) === null) {
        avisos.push('Score Lawton ausente, inferencia pode ficar menos precisa.');
    }

    const complexidade = inferirComplexidade(avaliacao, detalhes);
    const tipoProfissional = inferirTipoProfissional(complexidade);
    const horasDiarias = inferirHorasDiarias(avaliacao, detalhes);
    const duracaoDias = inferirDuracaoDias(detalhes);

    const baseInput: OrcamentoInput = {
        tipoProfissional,
        complexidade,
        horasDiarias,
        duracaoDias,
        incluirNoturno: horasDiarias >= 12,
        feriados: 0,
    };

    return {
        inputEconomico: {
            ...baseInput,
            tipoProfissional: 'CUIDADOR',
            complexidade: 'BAIXA',
        },
        inputRecomendado: baseInput,
        inputPremium: {
            ...baseInput,
            tipoProfissional: 'TECNICO_ENF',
            complexidade: 'ALTA',
        },
        metadados: {
            complexidadeInferida: complexidade,
            tipoProfissionalInferido: tipoProfissional,
            horasDiariasInferidas: horasDiarias,
            avisos,
        },
    };
}

export function avaliacaoToEnterprisePricingInputs(
    avaliacao: AnyRecord,
): AvaliacaoToEnterprisePricingResult {
    const detalhes = parseDetalhes(avaliacao);
    const avisos: string[] = [];

    if (asNumber(avaliacao.abemidScore) === null) {
        avisos.push('ABEMID ausente no registro principal; inferencia usa fallback.');
    }
    if (extractKatzScore(avaliacao, detalhes) === null) {
        avisos.push('Katz ausente; inferencia de complexidade pode ficar menos precisa.');
    }
    if (extractLawtonScore(avaliacao, detalhes) === null) {
        avisos.push('Lawton ausente; inferencia de complexidade pode ficar menos precisa.');
    }

    const complexidade = inferirComplexidade(avaliacao, detalhes);
    const tipoProfissional = inferirTipoProfissional(complexidade);
    const horasDiarias = inferirHorasDiarias(avaliacao, detalhes);
    const quantidadePacientes = inferirQuantidadePacientes(avaliacao, detalhes);
    const diseaseCodes = inferirDoencasCodes(detalhes);
    const metodoPagamento = inferirMetodoPagamento(detalhes);
    const periodoPagamento = inferirPeriodoPagamento(detalhes);
    const descontoPresetPercent = inferirDescontoPresetPercent(detalhes);
    const descontoManualPercent = inferirDescontoManualPercent(detalhes);
    const minicustosOverrides = inferirMinicustosOverrides(detalhes);

    const baseInput: PricingCalculationInput = {
        profissional: mapTipoProfissionalToEnterprise(tipoProfissional),
        horas: Math.max(1, horasDiarias),
        quantidadePacientes,
        metodoPagamento,
        periodoPagamento,
        diseaseCodes,
        descontoPresetPercent,
        descontoManualPercent,
        minicustosOverrides,
        flags: buildEnterpriseFlags(avaliacao, horasDiarias, complexidade),
    };

    return {
        inputEconomico: {
            ...baseInput,
            profissional: 'CUIDADOR',
            quantidadePacientes: 1,
            diseaseCodes: [],
            descontoManualPercent: 0,
        },
        inputRecomendado: baseInput,
        inputPremium: {
            ...baseInput,
            profissional: 'TECNICO_ENF',
            diseaseCodes,
            flags: {
                ...(baseInput.flags || {}),
                altoRisco: true,
            },
        },
        metadados: {
            complexidadeInferida: complexidade,
            tipoProfissionalInferido: tipoProfissional,
            horasDiariasInferidas: horasDiarias,
            quantidadePacientesInferida: quantidadePacientes,
            doencasInferidas: diseaseCodes,
            avisos,
        },
    };
}
