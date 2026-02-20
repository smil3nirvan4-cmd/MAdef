import type { OrcamentoPDFData } from './pdf-generator';
import type { OrcamentoSendOptions } from './send-options';
import { renderTemplateContent } from '@/lib/whatsapp/outbox/template-renderer';

export type CommercialDocumentType = 'PROPOSTA' | 'CONTRATO';

export interface CommercialMessageRender {
    template: string;
    rendered: string;
    missingVariables: string[];
    variables: Record<string, string | number>;
}

const DEFAULT_PROPOSTA_TEMPLATE = [
    'Proposta Comercial Maos Amigas',
    '',
    'Ola, {{nome}}. Foi um prazer realizar a avaliacao hoje.',
    'Com base no que conversamos, preparamos um plano personalizado.',
    '',
    'Resumo da Avaliacao:',
    '- Gatilho: {{gatilho}}',
    '- Complexidade: {{complexidade}}',
    '- Medicamentos: {{medicamentos}}',
    '- Quedas: {{quedas}}',
    '- Obs: {{observacoes}}',
    '',
    'Configuracao Comercial:',
    '- Valor do periodo (R$): {{valorPeriodo}}',
    '- Data vencimento: {{dataVencimento}}',
    '- Desconto (%): {{descontoPercentNumero}}%',
    '- Descontos (R$): {{descontoValor}}',
    '- Acrescimos (R$): {{acrescimosValor}}',
    '- Metodos de pagamento: {{metodosPagamento}}',
    '- Forma de pagamento: {{formasPagamento}}',
    '',
    'Investimento final: {{investimentoTotal}}',
    '(Entrada: {{entrada}} + {{parcelas}}x de {{valorParcela}})',
    '{{tipoCobertura}}',
    '',
    'Documento PDF estruturado em anexo.',
    'Validade da proposta: {{validadeHoras}}h.',
    'Ref.: {{referencia}}',
].join('\n');

const DEFAULT_CONTRATO_TEMPLATE = [
    'Contrato Comercial Maos Amigas',
    '',
    'Ola, {{nome}}.',
    'Seu contrato foi estruturado com base na avaliacao clinica e configuracao comercial abaixo.',
    '',
    'Resumo da Avaliacao:',
    '- Gatilho: {{gatilho}}',
    '- Complexidade: {{complexidade}}',
    '- Medicamentos: {{medicamentos}}',
    '- Quedas: {{quedas}}',
    '- Obs: {{observacoes}}',
    '',
    'Configuracao Comercial:',
    '- Valor do periodo (R$): {{valorPeriodo}}',
    '- Data vencimento: {{dataVencimento}}',
    '- Desconto (%): {{descontoPercentNumero}}%',
    '- Descontos (R$): {{descontoValor}}',
    '- Acrescimos (R$): {{acrescimosValor}}',
    '- Metodos de pagamento: {{metodosPagamento}}',
    '- Forma de pagamento: {{formasPagamento}}',
    '',
    'Investimento final: {{investimentoTotal}}',
    '(Entrada: {{entrada}} + {{parcelas}}x de {{valorParcela}})',
    '{{tipoCobertura}}',
    '',
    'Documento PDF estruturado em anexo.',
    'Ref.: {{referencia}}',
].join('\n');

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object'
        ? value as Record<string, unknown>
        : {};
}

function parseJson(value: unknown): Record<string, unknown> {
    if (typeof value !== 'string' || !value.trim()) return {};
    try {
        const parsed = JSON.parse(value) as unknown;
        return asRecord(parsed);
    } catch {
        return {};
    }
}

function brl(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
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
    return parsed.toLocaleDateString('pt-BR');
}

function toNumber(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function defaultParcelOptions(): string[] {
    return ['1x sem juros', '2x sem juros', '3x sem juros', '4x sem juros'];
}

function defaultPaymentMethods(): string[] {
    return ['PIX', 'CARTAO DE CREDITO'];
}

function parseEvaluationDetails(
    avaliacao: Record<string, unknown> | null | undefined,
    orcamento: Record<string, unknown>,
) {
    const fromAvaliacao = asRecord(avaliacao?.dadosDetalhados);
    const parsedAvaliacao = Object.keys(fromAvaliacao).length
        ? fromAvaliacao
        : parseJson(avaliacao?.dadosDetalhados);
    if (Object.keys(parsedAvaliacao).length) {
        return parsedAvaliacao;
    }

    const snapshotOutput = parseJson(orcamento.snapshotOutput);
    return asRecord(snapshotOutput.dadosDetalhados);
}

function buildEvaluationSummary(
    avaliacao: Record<string, unknown> | null | undefined,
    orcamento: Record<string, unknown>,
) {
    const details = parseEvaluationDetails(avaliacao, orcamento);
    const discovery = asRecord(details.discovery);
    const clinical = asRecord(details.clinical);
    const abemid = asRecord(details.abemid);
    const medicamentos = asRecord(clinical.medicamentos);
    const detalhesOrcamento = asRecord(details.orcamento);

    return {
        gatilho: String(discovery.gatilho || 'Nao informado'),
        complexidade: String(
            avaliacao?.nivelSugerido
            || detalhesOrcamento.complexidade
            || orcamento.complexidade
            || asRecord(orcamento.resumoSelecionado).complexidade
            || 'N/A',
        ),
        medicamentos: String(medicamentos.total || 'N/A'),
        quedas: String(clinical.quedas || 'N/A'),
        observacoes: String(abemid.observacoes || 'Sem observacoes'),
    };
}

function resolveTemplate(kind: CommercialDocumentType, customTemplate?: string): string {
    const normalized = String(customTemplate || '').trim();
    if (normalized) return normalized;
    return kind === 'PROPOSTA' ? DEFAULT_PROPOSTA_TEMPLATE : DEFAULT_CONTRATO_TEMPLATE;
}

export function buildCommercialMessageVariables(args: {
    tipo: CommercialDocumentType;
    pacienteNome: string;
    pdfData: OrcamentoPDFData;
    avaliacao: Record<string, unknown> | null | undefined;
    orcamento: Record<string, unknown>;
    sendOptions?: OrcamentoSendOptions;
}): Record<string, string | number> {
    const { pacienteNome, pdfData, avaliacao, orcamento, sendOptions } = args;
    const resumo = buildEvaluationSummary(avaliacao, orcamento);

    const valorPeriodo = round2(sendOptions?.valorPeriodo ?? pdfData.cenario.totalSemanal);
    const descontoPercentNumero = round2(sendOptions?.descontoManualPercent ?? 0);
    const descontoValor = round2(sendOptions?.descontoValor ?? 0);
    const acrescimosValor = round2(sendOptions?.acrescimosValor ?? 0);
    const descontoPercentCalculado = round2((valorPeriodo * descontoPercentNumero) / 100);
    const totalLiquido = round2(
        sendOptions?.valorFinal
        ?? Math.max(0, valorPeriodo - descontoPercentCalculado - descontoValor + acrescimosValor),
    );

    const parcelas = Math.max(1, Math.round(sendOptions?.parcelas ?? 1));
    const entrada = round2(sendOptions?.entrada ?? 0);
    const valorParcela = round2(sendOptions?.valorParcela ?? Math.max(0, (totalLiquido - entrada) / parcelas));
    const validadeHoras = Math.max(1, Math.round(sendOptions?.validadeHoras ?? 24));

    const metodosPagamento = sendOptions?.metodosPagamento?.length
        ? sendOptions.metodosPagamento.join(', ')
        : defaultPaymentMethods().join(', ');
    const formasPagamento = sendOptions?.opcoesParcelamento?.length
        ? sendOptions.opcoesParcelamento.join(', ')
        : defaultParcelOptions().join(', ');
    const dataVencimento = sendOptions?.dataVencimento
        ? formatDateBR(sendOptions.dataVencimento)
        : formatDateBR(new Date().toISOString());

    return {
        nome: pacienteNome || 'Paciente',
        gatilho: resumo.gatilho,
        complexidade: resumo.complexidade,
        medicamentos: resumo.medicamentos,
        quedas: resumo.quedas,
        observacoes: resumo.observacoes,
        valorPeriodo: brl(valorPeriodo),
        valorPeriodoNumero: valorPeriodo,
        dataVencimento,
        descontoPercentNumero,
        descontoValor: brl(descontoValor),
        acrescimosValor: brl(acrescimosValor),
        metodosPagamento,
        formasPagamento,
        investimentoTotal: brl(totalLiquido),
        entrada: brl(entrada),
        parcelas,
        valorParcela: brl(valorParcela),
        validadeHoras,
        referencia: pdfData.referencia,
        tipoCobertura: pdfData.presetCoberturaLabel || '',
    };
}

export function renderCommercialMessage(args: {
    tipo: CommercialDocumentType;
    pacienteNome: string;
    pdfData: OrcamentoPDFData;
    avaliacao: Record<string, unknown> | null | undefined;
    orcamento: Record<string, unknown>;
    sendOptions?: OrcamentoSendOptions;
}): CommercialMessageRender {
    const variables = buildCommercialMessageVariables(args);
    const template = resolveTemplate(args.tipo, args.sendOptions?.mensagemTemplate);
    const rendered = renderTemplateContent(template, variables);

    return {
        template,
        rendered: rendered.rendered,
        missingVariables: rendered.missingVariables,
        variables,
    };
}

export function getDefaultCommercialTemplate(kind: CommercialDocumentType): string {
    return resolveTemplate(kind);
}
