import { z } from 'zod';

export const cenarioSelecionadoSchema = z.enum(['economico', 'recomendado', 'premium']);
export const presetCoberturaSchema = z.enum(['1_DIA_12H', '1_DIA_24H', '1_SEMANA', '15_DIAS', 'MENSAL']);
export const horasCoberturaSchema = z.union([z.literal(12), z.literal(24)]);

function emptyToUndefined(value: unknown): unknown {
    if (value === '' || value === null) return undefined;
    return value;
}

const sendOptionsInputSchema = z.object({
    cenarioSelecionado: z.union([z.string(), cenarioSelecionadoSchema]).optional(),
    descontoManualPercent: z.preprocess(
        emptyToUndefined,
        z.coerce.number().min(0).max(100),
    ).optional(),
    descontoPercent: z.preprocess(
        emptyToUndefined,
        z.coerce.number().min(0).max(100),
    ).optional(),
    descontoValor: z.preprocess(
        emptyToUndefined,
        z.coerce.number().min(0),
    ).optional(),
    acrescimosValor: z.preprocess(
        emptyToUndefined,
        z.coerce.number().min(0),
    ).optional(),
    valorPeriodo: z.preprocess(
        emptyToUndefined,
        z.coerce.number().positive(),
    ).optional(),
    dataVencimento: z.preprocess(emptyToUndefined, z.string()).optional(),
    metodosPagamento: z.union([z.array(z.string()), z.string()]).optional(),
    opcoesParcelamento: z.union([z.array(z.string()), z.string()]).optional(),
    parcelas: z.preprocess(emptyToUndefined, z.coerce.number().min(1).max(24)).optional(),
    entrada: z.preprocess(emptyToUndefined, z.coerce.number().min(0)).optional(),
    valorParcela: z.preprocess(emptyToUndefined, z.coerce.number().min(0)).optional(),
    validadeHoras: z.preprocess(emptyToUndefined, z.coerce.number().min(1).max(168)).optional(),
    mensagemTemplate: z.preprocess(emptyToUndefined, z.string()).optional(),
    valorFinal: z.preprocess(
        emptyToUndefined,
        z.coerce.number().positive(),
    ).optional(),
    minicustosDesativados: z.union([z.array(z.string()), z.string()]).optional(),
    dataInicioCuidado: z.preprocess(emptyToUndefined, z.string()).optional(),
    dataFimCuidado: z.preprocess(emptyToUndefined, z.string()).optional(),
    diasAtendimento: z.union([z.array(z.string()), z.string()]).optional(),
    periodicidade: z.preprocess(emptyToUndefined, z.string()).optional(),
    semanasPlanejadas: z.preprocess(emptyToUndefined, z.coerce.number().min(1)).optional(),
    mesesPlanejados: z.preprocess(emptyToUndefined, z.coerce.number().min(1)).optional(),
    horasCuidadoDia: z.preprocess(emptyToUndefined, z.coerce.number().min(1).max(24)).optional(),
    tempoCuidadoDescricao: z.preprocess(emptyToUndefined, z.string()).optional(),
    alocacaoResumo: z.preprocess(emptyToUndefined, z.string()).optional(),
    presetCobertura: z.preprocess(emptyToUndefined, presetCoberturaSchema).optional(),
    horasCoberturaOverride: z.preprocess(emptyToUndefined, z.coerce.number().pipe(horasCoberturaSchema)).optional(),
}).passthrough();

export interface OrcamentoSendOptions {
    cenarioSelecionado?: z.infer<typeof cenarioSelecionadoSchema>;
    descontoManualPercent?: number;
    descontoValor?: number;
    acrescimosValor?: number;
    valorPeriodo?: number;
    dataVencimento?: string;
    metodosPagamento?: string[];
    opcoesParcelamento?: string[];
    parcelas?: number;
    entrada?: number;
    valorParcela?: number;
    validadeHoras?: number;
    mensagemTemplate?: string;
    valorFinal?: number;
    minicustosDesativados?: string[];
    dataInicioCuidado?: string;
    dataFimCuidado?: string;
    diasAtendimento?: string[];
    periodicidade?: string;
    semanasPlanejadas?: number;
    mesesPlanejados?: number;
    horasCuidadoDia?: number;
    tempoCuidadoDescricao?: string;
    alocacaoResumo?: string;
    presetCobertura?: z.infer<typeof presetCoberturaSchema>;
    horasCoberturaOverride?: 12 | 24;
}

function normalizeCenarioSelecionado(value: unknown): OrcamentoSendOptions['cenarioSelecionado'] {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toLowerCase();
    if (normalized === 'economico') return 'economico';
    if (normalized === 'premium') return 'premium';
    if (normalized === 'recomendado') return 'recomendado';
    return undefined;
}

export function normalizeMinicustosDesativados(value: unknown): string[] | undefined {
    if (!value) return undefined;

    const list = Array.isArray(value)
        ? value
        : typeof value === 'string'
            ? value.split(',').map((item) => item.trim())
            : [];

    const normalized = [...new Set(
        list
            .map((item) => String(item || '').trim())
            .filter(Boolean),
    )];

    return normalized.length ? normalized : undefined;
}

function normalizeStringList(value: unknown): string[] | undefined {
    return normalizeMinicustosDesativados(value);
}

export function parseOrcamentoSendOptions(value: unknown): OrcamentoSendOptions | undefined {
    const parsed = sendOptionsInputSchema.safeParse(value ?? {});
    if (!parsed.success) {
        const reason = parsed.error.issues.map((issue) => issue.message).join(', ');
        throw new Error(`Opcoes de envio invalidas: ${reason}`);
    }

    const cenarioSelecionado = normalizeCenarioSelecionado(parsed.data.cenarioSelecionado);
    const descontoManualPercent = parsed.data.descontoManualPercent ?? parsed.data.descontoPercent;
    const descontoValor = parsed.data.descontoValor;
    const acrescimosValor = parsed.data.acrescimosValor;
    const valorPeriodo = parsed.data.valorPeriodo;
    const dataVencimento = parsed.data.dataVencimento;
    const metodosPagamento = normalizeStringList(parsed.data.metodosPagamento);
    const opcoesParcelamento = normalizeStringList(parsed.data.opcoesParcelamento);
    const parcelas = parsed.data.parcelas;
    const entrada = parsed.data.entrada;
    const valorParcela = parsed.data.valorParcela;
    const validadeHoras = parsed.data.validadeHoras;
    const mensagemTemplate = parsed.data.mensagemTemplate;
    const valorFinal = parsed.data.valorFinal;
    const minicustosDesativados = normalizeMinicustosDesativados(parsed.data.minicustosDesativados);
    const diasAtendimento = normalizeMinicustosDesativados(parsed.data.diasAtendimento);
    const dataInicioCuidado = parsed.data.dataInicioCuidado;
    const dataFimCuidado = parsed.data.dataFimCuidado;
    const periodicidade = parsed.data.periodicidade;
    const semanasPlanejadas = parsed.data.semanasPlanejadas;
    const mesesPlanejados = parsed.data.mesesPlanejados;
    const horasCuidadoDia = parsed.data.horasCuidadoDia;
    const tempoCuidadoDescricao = parsed.data.tempoCuidadoDescricao;
    const alocacaoResumo = parsed.data.alocacaoResumo;
    const presetCobertura = parsed.data.presetCobertura as OrcamentoSendOptions['presetCobertura'];
    const horasCoberturaOverride = parsed.data.horasCoberturaOverride as OrcamentoSendOptions['horasCoberturaOverride'];

    if (
        cenarioSelecionado === undefined
        && descontoManualPercent === undefined
        && descontoValor === undefined
        && acrescimosValor === undefined
        && valorPeriodo === undefined
        && dataVencimento === undefined
        && metodosPagamento === undefined
        && opcoesParcelamento === undefined
        && parcelas === undefined
        && entrada === undefined
        && valorParcela === undefined
        && validadeHoras === undefined
        && mensagemTemplate === undefined
        && valorFinal === undefined
        && minicustosDesativados === undefined
        && diasAtendimento === undefined
        && dataInicioCuidado === undefined
        && dataFimCuidado === undefined
        && periodicidade === undefined
        && semanasPlanejadas === undefined
        && mesesPlanejados === undefined
        && horasCuidadoDia === undefined
        && tempoCuidadoDescricao === undefined
        && alocacaoResumo === undefined
        && presetCobertura === undefined
        && horasCoberturaOverride === undefined
    ) {
        return undefined;
    }

    return {
        cenarioSelecionado,
        descontoManualPercent,
        descontoValor,
        acrescimosValor,
        valorPeriodo,
        dataVencimento,
        metodosPagamento,
        opcoesParcelamento,
        parcelas,
        entrada,
        valorParcela,
        validadeHoras,
        mensagemTemplate,
        valorFinal,
        minicustosDesativados,
        dataInicioCuidado,
        dataFimCuidado,
        diasAtendimento,
        periodicidade,
        semanasPlanejadas,
        mesesPlanejados,
        horasCuidadoDia,
        tempoCuidadoDescricao,
        alocacaoResumo,
        presetCobertura,
        horasCoberturaOverride,
    };
}

export function parseOrcamentoSendOptionsSafe(value: unknown): OrcamentoSendOptions | undefined {
    try {
        return parseOrcamentoSendOptions(value);
    } catch {
        return undefined;
    }
}
