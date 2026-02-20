import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type {
    AvaliacaoSectionData,
    CenarioData,
    ConfiguracaoComercialData,
    OrcamentoPDFData,
    PlantaoData,
} from './pdf-generator';
import type { OrcamentoSendOptions } from './send-options';
import { COVERAGE_PRESETS, getPresetShortLabel, type CoveragePresetKey } from '../pricing/coverage-presets';

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object'
        ? value as Record<string, unknown>
        : {};
}

function parseJsonSafely<T>(value: unknown): T | null {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
        return JSON.parse(value) as T;
    } catch {
        return null;
    }
}

function numberOr(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function round2(value: number): number {
    return Number(value.toFixed(2));
}

function formatDateBR(value: string): string {
    const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDate) {
        return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return format(parsed, 'dd/MM/yyyy', { locale: ptBR });
}

function defaultPaymentMethods(): string[] {
    return ['PIX', 'CARTAO DE CREDITO'];
}

function defaultParcelOptions(): string[] {
    return ['1x sem juros', '2x sem juros', '3x sem juros', '4x sem juros'];
}

function stringOr(value: unknown, fallback = ''): string {
    const normalized = String(value ?? '').trim();
    return normalized || fallback;
}

function listFromUnknown(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value
            .map((item) => String(item ?? '').trim())
            .filter(Boolean);
    }
    const text = stringOr(value, '');
    if (!text) return [];
    return text
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function joinList(value: unknown): string {
    const list = listFromUnknown(value);
    return list.length ? list.join(', ') : '';
}

function pushLine(lines: string[], label: string, value: unknown) {
    const text = Array.isArray(value) ? joinList(value) : stringOr(value, '');
    if (!text) return;
    lines.push(`${label}: ${text}`);
}

function objectSummary(value: unknown): string {
    const row = asRecord(value);
    const pairs = Object.entries(row)
        .map(([key, fieldValue]) => `${key}: ${String(fieldValue ?? '').trim()}`)
        .filter((item) => item && !item.endsWith(':'));
    return pairs.join(' | ');
}

function plantoesPadrao(): PlantaoData[] {
    return [
        { numero: 1, dia: 'Domingo', horario: '19:00-07:00', turno: 'Noturno + FDS', cuidador: 'C1', valorCuidador: 342, taxaMA: 68.02, total: 410.02 },
        { numero: 2, dia: 'Segunda', horario: '07:00-19:00', turno: 'Diurno', cuidador: 'C2', valorCuidador: 270, taxaMA: 59.95, total: 329.95 },
        { numero: 3, dia: 'Segunda', horario: '19:00-07:00', turno: 'Noturno', cuidador: 'C3', valorCuidador: 306, taxaMA: 63.98, total: 369.98 },
        { numero: 4, dia: 'Terca', horario: '07:00-19:00', turno: 'Diurno', cuidador: 'C4', valorCuidador: 270, taxaMA: 59.95, total: 329.95 },
        { numero: 5, dia: 'Terca', horario: '19:00-07:00', turno: 'Noturno', cuidador: 'C5', valorCuidador: 306, taxaMA: 63.98, total: 369.98 },
        { numero: 6, dia: 'Quarta', horario: '07:00-19:00', turno: 'Diurno', cuidador: 'C6', valorCuidador: 270, taxaMA: 59.95, total: 329.95 },
        { numero: 7, dia: 'Quarta', horario: '19:00-07:00', turno: 'Noturno', cuidador: 'C1', valorCuidador: 306, taxaMA: 63.98, total: 369.98 },
        { numero: 8, dia: 'Quinta', horario: '07:00-19:00', turno: 'Diurno', cuidador: 'C2', valorCuidador: 270, taxaMA: 59.95, total: 329.95 },
        { numero: 9, dia: 'Quinta', horario: '19:00-07:00', turno: 'Noturno', cuidador: 'C3', valorCuidador: 306, taxaMA: 63.98, total: 369.98 },
        { numero: 10, dia: 'Sexta', horario: '07:00-19:00', turno: 'Diurno', cuidador: 'C4', valorCuidador: 270, taxaMA: 59.95, total: 329.95 },
        { numero: 11, dia: 'Sexta', horario: '19:00-07:00', turno: 'Noturno', cuidador: 'C5', valorCuidador: 306, taxaMA: 63.98, total: 369.98 },
    ];
}

function formatTime(value: unknown): string | null {
    const parsed = new Date(String(value || ''));
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function normalizePlantoes(value: unknown, totalFallback = 0): PlantaoData[] {
    if (!Array.isArray(value) || value.length === 0) return plantoesPadrao();

    const normalized: PlantaoData[] = value.map((item, index) => {
        const row = asRecord(item);
        const startLabel = formatTime(row.startAt) || String(row.horarioInicio || '07:00');
        const endLabel = formatTime(row.endAt) || String(row.horarioFim || '19:00');

        return {
            numero: numberOr(row.numero, index + 1),
            dia: String(row.dia ?? row.date ?? 'Dia'),
            horario: String(row.horario ?? `${startLabel}-${endLabel}`),
            turno: String(
                row.turno
                ?? (row.dayType === 'HOLIDAY'
                    ? 'Feriado'
                    : row.dayType === 'WEEKEND'
                        ? 'FDS'
                        : 'Diurno'),
            ),
            cuidador: String(row.cuidador ?? `C${(index % 6) + 1}`),
            valorCuidador: numberOr(row.valorCuidador, 0),
            taxaMA: numberOr(row.taxaMA, 0),
            total: numberOr(row.total, 0),
        };
    });

    const total = normalized.reduce((acc, current) => acc + numberOr(current.total, 0), 0);
    if (total > 0) return normalized;
    if (totalFallback <= 0) return normalized.length > 0 ? normalized : plantoesPadrao();

    const per = round2(totalFallback / Math.max(1, normalized.length));
    return normalized.map((item) => ({
        ...item,
        valorCuidador: round2(per * 0.75),
        taxaMA: round2(per * 0.25),
        total: per,
    }));
}

function normalizeDescontos(value: unknown): Array<{ periodo: string; percentual: number }> {
    if (!Array.isArray(value) || value.length === 0) {
        return [
            { periodo: 'Semanal', percentual: 2 },
            { periodo: 'Mensal', percentual: 5 },
            { periodo: 'Trimestral', percentual: 10 },
            { periodo: 'Semestral', percentual: 12 },
        ];
    }
    return value.map((item) => {
        const row = asRecord(item);
        return {
            periodo: String(row.periodo ?? 'Periodo'),
            percentual: numberOr(row.percentual, 0),
        };
    });
}

function normalizeCenario(raw: unknown, valorFinalFallback: number): CenarioData {
    const parsed = asRecord(raw);
    const scenarioData = asRecord(parsed.data);
    const scenarioMeta = asRecord(parsed.meta);
    const normalizedSchedule = asRecord(scenarioMeta.normalizedSchedule);
    const parametrosRaw = asRecord(parsed.parametros || scenarioData.parametros);

    const totalSemanal = numberOr(
        parsed.totalSemanal
        ?? scenarioData.totalSemanal
        ?? scenarioData.total
        ?? parsed.valorFinal,
        valorFinalFallback || 3909.67,
    );
    const plantoesSource = parsed.plantoes
        ?? scenarioData.plantoes
        ?? normalizedSchedule.occurrences;
    const plantoes = normalizePlantoes(plantoesSource, totalSemanal);
    const diasAtivos = Math.max(1, numberOr(
        parsed.duracaoDias
        ?? normalizedSchedule.totalDaysActive
        ?? normalizedSchedule.totalOccurrences,
        Math.max(1, plantoes.length),
    ));
    const estimativaMensal = numberOr(
        parsed.estimativaMensal
        ?? scenarioData.estimativaMensal,
        (totalSemanal / diasAtivos) * 30,
    );

    return {
        nome: String(parsed.nome ?? parsed.label ?? 'Recomendado'),
        totalSemanal: totalSemanal || valorFinalFallback || 3909.67,
        estimativaMensal,
        plantoes,
        parametros: {
            r0: numberOr(parametrosRaw.r0, 180),
            a2p: numberOr(parametrosRaw.a2p, 50),
            an: numberOr(parametrosRaw.an, 20),
            afds: numberOr(parametrosRaw.afds, 20),
            metodoPagamento: String(parametrosRaw.metodoPagamento ?? 'Pix'),
            periodo: String(parametrosRaw.periodo ?? 'Semanal'),
        },
        descontos: normalizeDescontos(parsed.descontos),
        coberturaInicio: parsed.coberturaInicio ? String(parsed.coberturaInicio) : 'Dom 19h',
        coberturaFim: parsed.coberturaFim ? String(parsed.coberturaFim) : 'Sab 07h',
    };
}

function selectScenarioRaw(
    orcamento: Record<string, unknown>,
    options?: OrcamentoSendOptions,
): unknown {
    const selecionado = options?.cenarioSelecionado
        ?? String(orcamento.cenarioSelecionado ?? '').trim().toLowerCase();
    if (selecionado === 'economico') return orcamento.cenarioEconomico;
    if (selecionado === 'premium') return orcamento.cenarioPremium;
    if (selecionado === 'recomendado') return orcamento.cenarioRecomendado;

    return (
        orcamento.cenarioRecomendado
        ?? orcamento.cenarioEconomico
        ?? orcamento.cenarioPremium
        ?? null
    );
}

function parseScenarioObject(raw: unknown): Record<string, unknown> | null {
    if (!raw) return null;
    if (typeof raw === 'string') {
        return parseJsonSafely<Record<string, unknown>>(raw);
    }
    if (typeof raw === 'object') {
        return asRecord(raw);
    }
    return null;
}

function scaleScenarioToTotal(cenario: CenarioData, targetTotal: number): CenarioData {
    const safeTarget = targetTotal > 0 ? targetTotal : cenario.totalSemanal;
    const baseTotal = cenario.totalSemanal > 0
        ? cenario.totalSemanal
        : cenario.plantoes.reduce((acc, plantao) => acc + numberOr(plantao.total, 0), 0);
    const factor = baseTotal > 0 ? safeTarget / baseTotal : 1;

    const plantoes = cenario.plantoes.map((plantao) => ({
        ...plantao,
        valorCuidador: round2(plantao.valorCuidador * factor),
        taxaMA: round2(plantao.taxaMA * factor),
        total: round2(plantao.total * factor),
    }));

    return {
        ...cenario,
        totalSemanal: round2(safeTarget),
        estimativaMensal: round2(safeTarget * 4.33),
        plantoes,
    };
}

function applyScenarioOverrides(
    cenario: CenarioData,
    options?: OrcamentoSendOptions,
): CenarioData {
    if (!options) return cenario;

    let adjusted = cenario;

    if (options.valorPeriodo !== undefined && options.valorPeriodo > 0) {
        adjusted = scaleScenarioToTotal(adjusted, round2(options.valorPeriodo));
    }

    if (options.descontoManualPercent !== undefined && options.descontoManualPercent > 0) {
        const factor = Math.max(0, 1 - (options.descontoManualPercent / 100));
        adjusted = scaleScenarioToTotal(adjusted, round2(adjusted.totalSemanal * factor));
        adjusted = {
            ...adjusted,
            descontos: [
                ...adjusted.descontos,
                {
                    periodo: 'Manual',
                    percentual: round2(options.descontoManualPercent),
                },
            ],
        };
    }

    if (options.descontoValor !== undefined && options.descontoValor > 0) {
        adjusted = scaleScenarioToTotal(
            adjusted,
            round2(Math.max(0, adjusted.totalSemanal - options.descontoValor)),
        );
    }

    if (options.acrescimosValor !== undefined && options.acrescimosValor > 0) {
        adjusted = scaleScenarioToTotal(
            adjusted,
            round2(adjusted.totalSemanal + options.acrescimosValor),
        );
    }

    if (options.valorFinal !== undefined && options.valorFinal > 0) {
        adjusted = scaleScenarioToTotal(adjusted, round2(options.valorFinal));
    }

    return adjusted;
}

function buildConfiguracaoComercial(
    cenarioBase: CenarioData,
    cenarioFinal: CenarioData,
    createdAt: Date,
    options?: OrcamentoSendOptions,
): ConfiguracaoComercialData {
    const valorPeriodo = round2(options?.valorPeriodo ?? cenarioBase.totalSemanal);
    const descontoPercentual = round2(options?.descontoManualPercent ?? 0);
    const descontoValor = round2(options?.descontoValor ?? 0);
    const acrescimosValor = round2(options?.acrescimosValor ?? 0);
    const parcelas = Math.max(1, Math.round(options?.parcelas ?? 1));
    const entrada = round2(options?.entrada ?? 0);
    const valorLiquido = round2(cenarioFinal.totalSemanal);
    const valorParcela = round2(
        options?.valorParcela ?? Math.max(0, (valorLiquido - entrada) / parcelas),
    );

    return {
        valorPeriodo,
        dataVencimento: formatDateBR(options?.dataVencimento || createdAt.toISOString()),
        descontoPercentual,
        descontoValor,
        acrescimosValor,
        metodosPagamento: options?.metodosPagamento?.length
            ? options.metodosPagamento
            : defaultPaymentMethods(),
        opcoesParcelamento: options?.opcoesParcelamento?.length
            ? options.opcoesParcelamento
            : defaultParcelOptions(),
        entrada,
        parcelas,
        valorParcela,
        valorLiquido,
    };
}

function hasPlanningOptions(options?: OrcamentoSendOptions): boolean {
    if (!options) return false;
    return Boolean(
        options.dataInicioCuidado
        || options.dataFimCuidado
        || options.periodicidade
        || options.semanasPlanejadas !== undefined
        || options.mesesPlanejados !== undefined
        || options.horasCuidadoDia !== undefined
        || options.diasAtendimento?.length
        || options.tempoCuidadoDescricao
        || options.alocacaoResumo
        || options.presetCobertura,
    );
}

function parseDetalhesAvaliacao(
    avaliacao: Record<string, unknown> | null | undefined,
    orcamento: Record<string, unknown>,
): Record<string, unknown> {
    const fromAvaliacaoRaw = avaliacao?.dadosDetalhados;
    if (typeof fromAvaliacaoRaw === 'string') {
        const parsed = parseJsonSafely<Record<string, unknown>>(fromAvaliacaoRaw);
        if (parsed) return parsed;
    }
    if (typeof fromAvaliacaoRaw === 'object' && fromAvaliacaoRaw !== null) {
        return asRecord(fromAvaliacaoRaw);
    }

    const snapshotOutput = parseJsonSafely<Record<string, unknown>>(orcamento.snapshotOutput);
    return asRecord(snapshotOutput?.dadosDetalhados);
}

function extractAvaliacaoSecoes(
    avaliacao: Record<string, unknown> | null | undefined,
    orcamento: Record<string, unknown>,
): AvaliacaoSectionData[] {
    const detalhes = parseDetalhesAvaliacao(avaliacao, orcamento);
    if (!Object.keys(detalhes).length) return [];

    const discovery = asRecord(detalhes.discovery);
    const patient = asRecord(detalhes.patient);
    const clinical = asRecord(detalhes.clinical);
    const abemid = asRecord(detalhes.abemid);
    const katz = asRecord(detalhes.katz);
    const lawton = asRecord(detalhes.lawton);
    const responsibilities = asRecord(detalhes.responsibilities);
    const evaluator = asRecord(detalhes.evaluator);

    const secaoDiscovery: string[] = [];
    pushLine(secaoDiscovery, 'Gatilho', discovery.gatilho);
    pushLine(secaoDiscovery, 'Urgencia', discovery.urgencia);
    pushLine(secaoDiscovery, 'Motivo da urgencia', discovery.motivoUrgencia);
    pushLine(secaoDiscovery, 'Situacao atual', discovery.situacaoAtual);
    pushLine(secaoDiscovery, 'Sobrecarga familiar', discovery.sobrecargaFamiliar);
    pushLine(secaoDiscovery, 'O que tira o sono', discovery.oQueTiraOSono);
    pushLine(secaoDiscovery, 'Preocupacoes', discovery.preocupacoes);
    pushLine(secaoDiscovery, 'Experiencia anterior', discovery.experienciaAnterior);

    const secaoPaciente: string[] = [];
    pushLine(secaoPaciente, 'Nome', patient.nome);
    pushLine(secaoPaciente, 'Nascimento', patient.dataNascimento);
    pushLine(secaoPaciente, 'Sexo', patient.sexo);
    pushLine(secaoPaciente, 'Peso', patient.peso);
    pushLine(secaoPaciente, 'Altura', patient.altura);
    pushLine(secaoPaciente, 'Endereco', patient.endereco);
    pushLine(secaoPaciente, 'Estado civil', patient.estadoCivil);
    pushLine(secaoPaciente, 'Religiao', patient.religiao);
    pushLine(secaoPaciente, 'Temperamento', patient.temperamento);
    pushLine(secaoPaciente, 'Exigencias e preferencias', patient.exigenciasPreferencias);
    pushLine(secaoPaciente, 'Tracos a evitar', patient.tracosEvitar);
    pushLine(secaoPaciente, 'Motivo para substituicao', patient.motivoSubstituicao);
    pushLine(secaoPaciente, 'Preferencias alimentares', patient.preferenciasAlimentares);

    const condicoes = asRecord(clinical.condicoes);
    const condicoesLista = [
        ...listFromUnknown(condicoes.neurologico),
        ...listFromUnknown(condicoes.cardiovascular),
        ...listFromUnknown(condicoes.respiratorio),
        ...listFromUnknown(condicoes.mobilidade),
        ...listFromUnknown(condicoes.endocrino),
        ...listFromUnknown(condicoes.psiquiatrico),
        ...listFromUnknown(condicoes.gastro),
        ...listFromUnknown(condicoes.outros),
    ];
    const medicamentos = asRecord(clinical.medicamentos);
    const secaoClinica: string[] = [];
    pushLine(secaoClinica, 'Condicoes', condicoesLista);
    pushLine(secaoClinica, 'Quedas', clinical.quedas);
    pushLine(secaoClinica, 'Medicamentos', medicamentos.total);
    pushLine(secaoClinica, 'Lista medicacao', medicamentos.lista);
    pushLine(secaoClinica, 'Alergias', medicamentos.alergias);
    pushLine(secaoClinica, 'Restricoes', medicamentos.restricoes);
    pushLine(secaoClinica, 'Dispositivos', clinical.dispositivos);

    const secaoEscalas: string[] = [];
    pushLine(secaoEscalas, 'ABEMID consciencia', abemid.consciencia);
    pushLine(secaoEscalas, 'ABEMID respiracao', abemid.respiracao);
    pushLine(secaoEscalas, 'ABEMID alimentacao', abemid.alimentacao);
    pushLine(secaoEscalas, 'ABEMID medicacao', abemid.medicacao);
    pushLine(secaoEscalas, 'ABEMID pele', abemid.pele);
    pushLine(secaoEscalas, 'ABEMID eliminacoes', abemid.eliminacoes);
    pushLine(secaoEscalas, 'ABEMID observacoes', abemid.observacoes);
    pushLine(secaoEscalas, 'Katz', objectSummary(katz));
    pushLine(secaoEscalas, 'Lawton', objectSummary(lawton));
    pushLine(secaoEscalas, 'Katz score', avaliacao?.katzScore);
    pushLine(secaoEscalas, 'Lawton score', avaliacao?.lawtonScore);
    pushLine(secaoEscalas, 'ABEMID score', avaliacao?.abemidScore);

    const medsResp = asRecord(responsibilities.medicamentos);
    const secaoResponsabilidades: string[] = [];
    pushLine(secaoResponsabilidades, 'Medicacao separacao', medsResp.separacao);
    pushLine(secaoResponsabilidades, 'Medicacao administracao', medsResp.administracao);
    pushLine(secaoResponsabilidades, 'Afeicao de sinais vitais', responsibilities.sinaisVitais);
    pushLine(secaoResponsabilidades, 'Estimulacao', responsibilities.estimulacao);
    pushLine(secaoResponsabilidades, 'Banho e Higiene', responsibilities.banhoHigiene);
    pushLine(secaoResponsabilidades, 'Roupas', responsibilities.roupas);
    pushLine(secaoResponsabilidades, 'Acompanhamento Externo', responsibilities.acompanhamentoExterno);
    pushLine(secaoResponsabilidades, 'Insumos', responsibilities.insumos);
    pushLine(secaoResponsabilidades, 'Alimentacao', responsibilities.alimentacao);
    pushLine(secaoResponsabilidades, 'Limpeza', responsibilities.limpeza);
    pushLine(secaoResponsabilidades, 'Observacoes', responsibilities.observacoes);

    const secaoAvaliador: string[] = [];
    pushLine(secaoAvaliador, 'Resumo do acompanhamento', evaluator.resumoVaga);
    pushLine(secaoAvaliador, 'Restricoes absolutas (HH)', evaluator.restricoesAbsolutas);
    pushLine(secaoAvaliador, 'Perfil ideal (HH)', evaluator.perfilIdeal);
    pushLine(secaoAvaliador, 'Complexidade (HH)', evaluator.complexidade);
    pushLine(secaoAvaliador, 'Setup geral do ambiente', evaluator.setupAmbiente);

    const secoes: AvaliacaoSectionData[] = [];
    if (secaoDiscovery.length) secoes.push({ titulo: 'Contexto da Demanda', linhas: secaoDiscovery });
    if (secaoPaciente.length) secoes.push({ titulo: 'Perfil do Paciente', linhas: secaoPaciente });
    if (secaoClinica.length) secoes.push({ titulo: 'Resumo Clinico', linhas: secaoClinica });
    if (secaoEscalas.length) secoes.push({ titulo: 'Escalas e ABEMID', linhas: secaoEscalas });
    if (secaoResponsabilidades.length) secoes.push({ titulo: 'Responsabilidades e Rotina', linhas: secaoResponsabilidades });
    if (secaoAvaliador.length) secoes.push({ titulo: 'Setup e Avaliador M.A.', linhas: secaoAvaliador });
    return secoes;
}

export function buildOrcamentoPDFData(
    avaliacao: Record<string, unknown> | null | undefined,
    orcamento: Record<string, unknown>,
    tipo: 'PROPOSTA' | 'CONTRATO',
    options?: OrcamentoSendOptions,
): OrcamentoPDFData {
    const cenarioRaw = selectScenarioRaw(orcamento, options);
    const cenarioParsed = parseScenarioObject(cenarioRaw);
    const cenarioBase = normalizeCenario(
        cenarioParsed,
        numberOr(options?.valorFinal, numberOr(orcamento.valorFinal, 3909.67)),
    );
    const cenario = applyScenarioOverrides(cenarioBase, options);
    const planejamento = hasPlanningOptions(options)
        ? {
            dataInicioCuidado: options?.dataInicioCuidado,
            dataFimCuidado: options?.dataFimCuidado,
            diasAtendimento: options?.diasAtendimento,
            periodicidade: options?.periodicidade,
            semanasPlanejadas: options?.semanasPlanejadas,
            mesesPlanejados: options?.mesesPlanejados,
            horasCuidadoDia: options?.horasCuidadoDia,
            tempoCuidadoDescricao: options?.tempoCuidadoDescricao,
            alocacaoResumo: options?.alocacaoResumo,
            presetCobertura: options?.presetCobertura,
        }
        : undefined;

    const presetKey = options?.presetCobertura as CoveragePresetKey | undefined;
    const presetCoberturaLabel = presetKey && COVERAGE_PRESETS[presetKey]
        ? getPresetShortLabel(presetKey, (options?.horasCoberturaOverride ?? 12) as 12 | 24)
        : undefined;

    const createdAt = orcamento.createdAt ? new Date(String(orcamento.createdAt)) : new Date();
    const orcamentoId = String(orcamento.id ?? 'ORC');
    const referencia = `${format(createdAt, 'yyyyMMdd')}-${orcamentoId.slice(-3).toUpperCase()}`;
    const avaliacaoPaciente = asRecord(avaliacao?.paciente);
    const configuracaoComercial = buildConfiguracaoComercial(cenarioBase, cenario, createdAt, options);

    return {
        referencia,
        dataEmissao: format(createdAt, 'dd/MM/yyyy', { locale: ptBR }),
        validadeDias: 15,
        pacienteNome: String(avaliacaoPaciente.nome ?? orcamento.pacienteNome ?? 'Paciente'),
        numeroPacientes: numberOr(cenarioParsed?.numeroPacientes, 2),
        condicaoClinica: String(cenarioParsed?.condicaoClinica ?? 'Baixa (hipertensao controlada)'),
        profissionalMinimo: String(cenarioParsed?.profissionalMinimo ?? 'Cuidador(a) - nivel 1'),
        cenario,
        planejamento,
        avaliacaoSecoes: extractAvaliacaoSecoes(avaliacao, orcamento),
        configuracaoComercial,
        tipo,
        presetCoberturaLabel,
    };
}
