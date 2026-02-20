'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    CheckCircle2,
    FileText,
    MessageCircle,
    Phone,
    XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useCapabilities } from '@/hooks/use-capabilities';

interface AvaliacaoDetail {
    id: string;
    status: string;
    nivelSugerido: string | null;
    cargaSugerida: string | null;
    valorProposto: string | null;
    whatsappEnviado: boolean;
    whatsappEnviadoEm: string | null;
    whatsappMessageId: string | null;
    whatsappErro: string | null;
    createdAt: string;
    validadoEm: string | null;
    dadosDetalhados: string | null;
    paciente: {
        id: string;
        nome: string | null;
        telefone: string;
        cidade: string | null;
        bairro: string | null;
        mensagens: Array<{ id: string; conteudo: string; direcao: string; timestamp: string }>;
        orcamentos: Array<{
            id: string;
            status: string;
            valorFinal: number | null;
            createdAt: string;
            cenarioSelecionado?: string | null;
            descontoManualPercent?: number | null;
            minicustosDesativados?: string | null;
            snapshotInput?: string | null;
        }>;
    };
}

interface SystemLogItem {
    id: string;
    type: string;
    action: string;
    message: string;
    createdAt: string;
    metadata: string | null;
}

interface DbSchemaStatusResponse {
    success: boolean;
    dbSchemaOk?: boolean;
    missingColumns?: string[];
}

const STATUS_VARIANT: Record<string, BadgeVariant> = {
    PENDENTE: 'warning',
    EM_ANALISE: 'info',
    PROPOSTA_ENVIADA: 'purple',
    CONTRATO_ENVIADO: 'purple',
    APROVADA: 'success',
    REJEITADA: 'error',
    CONCLUIDA: 'success',
};

const LOG_TYPE_BADGE: Record<string, BadgeVariant> = {
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
    WHATSAPP: 'success',
    DEBUG: 'default',
};

function safeFormatDate(value: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR');
}

type ScenarioKey = 'economico' | 'recomendado' | 'premium';

interface DocumentOptionsForm {
    orcamentoId: string;
    cenarioSelecionado: ScenarioKey;
    descontoManualPercent: string;
    descontoValor: string;
    acrescimosValor: string;
    valorPeriodo: string;
    dataVencimento: string;
    metodosPagamento: string;
    opcoesParcelamento: string;
    parcelas: string;
    entrada: string;
    valorParcela: string;
    valorFinal: string;
    mensagemTemplate: string;
    minicustosDesativados: string;
    dataInicioCuidado: string;
    dataFimCuidado: string;
    periodicidade: string;
    semanasPlanejadas: string;
    mesesPlanejados: string;
    horasCuidadoDia: string;
    diasAtendimento: string;
    tempoCuidadoDescricao: string;
    alocacaoResumo: string;
}

interface DocumentPreviewPayload {
    endpoint: string;
    method: 'POST';
    payload: Record<string, unknown>;
    fileName: string;
}

interface DocumentPreviewData {
    kind: 'proposta' | 'contrato';
    template: string;
    previewMessage: string;
    missingVariables: string[];
    pdfPreview: DocumentPreviewPayload;
}

function todayISO(): string {
    return new Date().toISOString().split('T')[0];
}

function sanitizeScenarioKey(value?: string | null): ScenarioKey {
    const normalized = String(value || 'recomendado').trim().toLowerCase();
    if (normalized === 'economico') return 'economico';
    if (normalized === 'premium') return 'premium';
    return 'recomendado';
}

function parseMinicustosStored(raw?: string | null): string {
    if (!raw || !raw.trim()) return '';
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
            return parsed.map((item) => String(item || '').trim()).filter(Boolean).join(', ');
        }
    } catch {
        // fallback to raw value
    }
    return raw;
}

function parsePlanningFromSnapshot(raw?: string | null): Partial<DocumentOptionsForm> {
    if (!raw || !raw.trim()) return {};
    try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const planning = (parsed.planejamento360 ?? parsed.sendOptions ?? {}) as Record<string, unknown>;
        const diasAtendimento = Array.isArray(planning.diasAtendimento)
            ? planning.diasAtendimento.map((item) => String(item || '').trim()).filter(Boolean).join(',')
            : '';
        return {
            dataInicioCuidado: String(planning.dataInicioCuidado ?? ''),
            dataFimCuidado: String(planning.dataFimCuidado ?? ''),
            periodicidade: String(planning.periodicidade ?? ''),
            semanasPlanejadas: planning.semanasPlanejadas !== undefined ? String(planning.semanasPlanejadas) : '',
            mesesPlanejados: planning.mesesPlanejados !== undefined ? String(planning.mesesPlanejados) : '',
            horasCuidadoDia: planning.horasCuidadoDia !== undefined ? String(planning.horasCuidadoDia) : '',
            diasAtendimento,
            tempoCuidadoDescricao: String(planning.tempoCuidadoDescricao ?? ''),
            alocacaoResumo: String(planning.alocacaoResumo ?? ''),
        };
    } catch {
        return {};
    }
}

export default function AvaliacaoDetailPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const { hasCapability } = useCapabilities();

    const [avaliacao, setAvaliacao] = useState<AvaliacaoDetail | null>(null);
    const [logs, setLogs] = useState<SystemLogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dbSchemaStatus, setDbSchemaStatus] = useState<{ ok: boolean; missingColumns: string[] }>({
        ok: true,
        missingColumns: [],
    });
    const [actionState, setActionState] = useState<string | null>(null);
    const [documentModalKind, setDocumentModalKind] = useState<'proposta' | 'contrato' | null>(null);
    const [documentOptions, setDocumentOptions] = useState<DocumentOptionsForm>({
        orcamentoId: '',
        cenarioSelecionado: 'recomendado',
        descontoManualPercent: '',
        descontoValor: '',
        acrescimosValor: '',
        valorPeriodo: '',
        dataVencimento: todayISO(),
        metodosPagamento: 'PIX, CARTAO DE CREDITO',
        opcoesParcelamento: '1x sem juros, 2x sem juros, 3x sem juros, 4x sem juros',
        parcelas: '1',
        entrada: '',
        valorParcela: '',
        valorFinal: '',
        mensagemTemplate: '',
        minicustosDesativados: '',
        dataInicioCuidado: '',
        dataFimCuidado: '',
        periodicidade: 'SEMANAL',
        semanasPlanejadas: '',
        mesesPlanejados: '',
        horasCuidadoDia: '',
        diasAtendimento: '',
        tempoCuidadoDescricao: '',
        alocacaoResumo: '',
    });
    const [previewLoading, setPreviewLoading] = useState(false);
    const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false);
    const [documentPreview, setDocumentPreview] = useState<DocumentPreviewData | null>(null);

    const canSendProposta = hasCapability('SEND_PROPOSTA');
    const canSendContrato = hasCapability('SEND_CONTRATO');
    const canViewLogs = hasCapability('VIEW_LOGS');
    const canManageOrcamentos = hasCapability('MANAGE_ORCAMENTOS');
    const isDbSchemaBlocked = !dbSchemaStatus.ok;

    const loadAvaliacao = useCallback(async () => {
        if (!params?.id) return;
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/admin/avaliacoes/${params.id}`, { cache: 'no-store' });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || !payload?.avaliacao) {
                throw new Error(payload?.error || 'Failed to load avaliacao');
            }
            setAvaliacao(payload.avaliacao);
        } catch (fetchError) {
            setAvaliacao(null);
            setError(fetchError instanceof Error ? fetchError.message : 'Failed to load avaliacao');
        } finally {
            setLoading(false);
        }
    }, [params?.id]);

    const loadLogs = useCallback(async (phone: string) => {
        if (!canViewLogs || !phone) {
            setLogs([]);
            return;
        }
        try {
            const params = new URLSearchParams({
                page: '1',
                pageSize: '20',
                phone: phone.replace(/\D/g, ''),
                sort: 'createdAt:desc',
            });
            const response = await fetch(`/api/admin/logs?${params.toString()}`, { cache: 'no-store' });
            const payload = await response.json().catch(() => ({ success: false }));
            if (response.ok && payload?.success) {
                setLogs(payload.data || []);
            }
        } catch {
            setLogs([]);
        }
    }, [canViewLogs]);

    const loadSchemaStatus = useCallback(async () => {
        try {
            const response = await fetch('/api/admin/capabilities', { cache: 'no-store' });
            const payload: DbSchemaStatusResponse = await response.json().catch(() => ({ success: false }));
            if (!response.ok || !payload.success) return;
            setDbSchemaStatus({
                ok: payload.dbSchemaOk !== false,
                missingColumns: Array.isArray(payload.missingColumns) ? payload.missingColumns : [],
            });
        } catch {
            // keep previous state
        }
    }, []);

    useEffect(() => {
        loadAvaliacao();
    }, [loadAvaliacao]);

    useEffect(() => {
        loadSchemaStatus();
    }, [loadSchemaStatus]);

    useEffect(() => {
        if (avaliacao?.paciente?.telefone) {
            loadLogs(avaliacao.paciente.telefone);
        }
    }, [avaliacao?.paciente?.telefone, loadLogs]);

    const handleStatusAction = async (action: 'aprovar' | 'rejeitar' | 'concluir') => {
        if (!avaliacao) return false;
        setActionState(action);
        try {
            await fetch(`/api/admin/avaliacoes/${avaliacao.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action }),
            });
            await loadAvaliacao();
        } finally {
            setActionState(null);
        }
    };

    const handleDocumentAction = async (
        kind: 'proposta' | 'contrato',
        body?: Record<string, unknown>,
    ): Promise<boolean> => {
        if (!avaliacao) return false;
        setActionState(kind);
        try {
            const response = await fetch(`/api/admin/avaliacoes/${avaliacao.id}/send-${kind}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body || {}),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || !payload?.success) {
                throw new Error(payload?.error?.message || `Failed to enqueue ${kind}`);
            }
            await loadAvaliacao();
            await loadLogs(avaliacao.paciente.telefone);
            return true;
        } catch (actionError) {
            setError(actionError instanceof Error ? actionError.message : `Failed to enqueue ${kind}`);
            return false;
        } finally {
            setActionState(null);
        }
    };

    const buildDocumentOptionsFromOrcamento = (
        orcamento: AvaliacaoDetail['paciente']['orcamentos'][number] | undefined,
    ): DocumentOptionsForm => {
        const planning = parsePlanningFromSnapshot(orcamento?.snapshotInput);
        return {
            orcamentoId: orcamento?.id || '',
            cenarioSelecionado: sanitizeScenarioKey(orcamento?.cenarioSelecionado),
            descontoManualPercent: orcamento?.descontoManualPercent !== null && orcamento?.descontoManualPercent !== undefined
                ? String(orcamento.descontoManualPercent)
                : '',
            descontoValor: '',
            acrescimosValor: '',
            valorPeriodo: orcamento?.valorFinal !== null && orcamento?.valorFinal !== undefined
                ? String(orcamento.valorFinal)
                : '',
            dataVencimento: todayISO(),
            metodosPagamento: 'PIX, CARTAO DE CREDITO',
            opcoesParcelamento: '1x sem juros, 2x sem juros, 3x sem juros, 4x sem juros',
            parcelas: '1',
            entrada: '',
            valorParcela: '',
            valorFinal: orcamento?.valorFinal !== null && orcamento?.valorFinal !== undefined
                ? String(orcamento.valorFinal)
                : '',
            mensagemTemplate: '',
            minicustosDesativados: parseMinicustosStored(orcamento?.minicustosDesativados),
            dataInicioCuidado: planning.dataInicioCuidado || '',
            dataFimCuidado: planning.dataFimCuidado || '',
            periodicidade: planning.periodicidade || 'SEMANAL',
            semanasPlanejadas: planning.semanasPlanejadas || '',
            mesesPlanejados: planning.mesesPlanejados || '',
            horasCuidadoDia: planning.horasCuidadoDia || '',
            diasAtendimento: planning.diasAtendimento || '',
            tempoCuidadoDescricao: planning.tempoCuidadoDescricao || '',
            alocacaoResumo: planning.alocacaoResumo || '',
        };
    };

    const fetchDocumentPreview = async (
        kind: 'proposta' | 'contrato',
        source: DocumentOptionsForm,
    ) => {
        if (!avaliacao) return;
        const parsed = buildDocumentPayload(source);
        if (!parsed.ok) {
            setError(parsed.error);
            return;
        }

        setPreviewLoading(true);
        try {
            const response = await fetch(`/api/admin/avaliacoes/${avaliacao.id}/preview-document`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...parsed.payload,
                    kind,
                }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || !payload?.success) {
                throw new Error(payload?.error?.message || 'Falha ao montar preview.');
            }

            setDocumentPreview(payload.data as DocumentPreviewData);
            if (!source.mensagemTemplate.trim() && typeof payload?.data?.template === 'string') {
                setDocumentOptions((prev) => ({ ...prev, mensagemTemplate: payload.data.template }));
            }
        } catch (previewError) {
            setDocumentPreview(null);
            setError(previewError instanceof Error ? previewError.message : 'Falha ao montar preview.');
        } finally {
            setPreviewLoading(false);
        }
    };

    const openDocumentPdfPreview = async () => {
        if (!documentPreview) return;
        setPdfPreviewLoading(true);
        try {
            const response = await fetch(documentPreview.pdfPreview.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(documentPreview.pdfPreview.payload || {}),
            });
            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload?.error || 'Falha ao gerar preview do PDF.');
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank', 'noopener,noreferrer');
            setTimeout(() => URL.revokeObjectURL(url), 5000);
        } catch (previewError) {
            setError(previewError instanceof Error ? previewError.message : 'Falha ao gerar preview do PDF.');
        } finally {
            setPdfPreviewLoading(false);
        }
    };

    const openDocumentModal = (kind: 'proposta' | 'contrato') => {
        if (!avaliacao) return;
        if (isDbSchemaBlocked) {
            setError(`Envio bloqueado: schema do banco desatualizado (${dbSchemaStatus.missingColumns.join(', ') || 'campos ausentes'}).`);
            return;
        }
        const latestOrcamento = avaliacao.paciente.orcamentos?.[0];
        const initial = buildDocumentOptionsFromOrcamento(latestOrcamento);
        setDocumentPreview(null);
        setDocumentOptions(initial);
        setDocumentModalKind(kind);
        void fetchDocumentPreview(kind, initial);
    };

    function buildDocumentPayload(
        source: DocumentOptionsForm = documentOptions,
    ): { ok: true; payload: Record<string, unknown> } | { ok: false; error: string } {
        const payload: Record<string, unknown> = {
            cenarioSelecionado: source.cenarioSelecionado,
        };

        if (source.orcamentoId.trim()) {
            payload.orcamentoId = source.orcamentoId.trim();
        }

        const descontoRaw = source.descontoManualPercent.trim();
        if (descontoRaw) {
            const desconto = Number(descontoRaw);
            if (!Number.isFinite(desconto) || desconto < 0 || desconto > 100) {
                return { ok: false, error: 'Desconto manual deve estar entre 0 e 100.' };
            }
            payload.descontoManualPercent = desconto;
        }

        const descontoValorRaw = source.descontoValor.trim();
        if (descontoValorRaw) {
            const descontoValor = Number(descontoValorRaw);
            if (!Number.isFinite(descontoValor) || descontoValor < 0) {
                return { ok: false, error: 'Desconto (R$) deve ser zero ou positivo.' };
            }
            payload.descontoValor = descontoValor;
        }

        const acrescimosRaw = source.acrescimosValor.trim();
        if (acrescimosRaw) {
            const acrescimosValor = Number(acrescimosRaw);
            if (!Number.isFinite(acrescimosValor) || acrescimosValor < 0) {
                return { ok: false, error: 'Acrescimos (R$) deve ser zero ou positivo.' };
            }
            payload.acrescimosValor = acrescimosValor;
        }

        const valorPeriodoRaw = source.valorPeriodo.trim();
        if (valorPeriodoRaw) {
            const valorPeriodo = Number(valorPeriodoRaw);
            if (!Number.isFinite(valorPeriodo) || valorPeriodo <= 0) {
                return { ok: false, error: 'Valor do periodo deve ser maior que zero.' };
            }
            payload.valorPeriodo = valorPeriodo;
        }

        if (source.dataVencimento.trim()) {
            payload.dataVencimento = source.dataVencimento.trim();
        }

        const metodosPagamento = source.metodosPagamento
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
        if (metodosPagamento.length > 0) {
            payload.metodosPagamento = [...new Set(metodosPagamento)];
        }

        const opcoesParcelamento = source.opcoesParcelamento
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
        if (opcoesParcelamento.length > 0) {
            payload.opcoesParcelamento = [...new Set(opcoesParcelamento)];
        }

        if (source.parcelas.trim()) {
            const parcelas = Number(source.parcelas);
            if (!Number.isFinite(parcelas) || parcelas < 1 || parcelas > 24) {
                return { ok: false, error: 'Parcelas deve estar entre 1 e 24.' };
            }
            payload.parcelas = parcelas;
        }

        if (source.entrada.trim()) {
            const entrada = Number(source.entrada);
            if (!Number.isFinite(entrada) || entrada < 0) {
                return { ok: false, error: 'Entrada deve ser zero ou positiva.' };
            }
            payload.entrada = entrada;
        }

        if (source.valorParcela.trim()) {
            const valorParcela = Number(source.valorParcela);
            if (!Number.isFinite(valorParcela) || valorParcela < 0) {
                return { ok: false, error: 'Valor da parcela deve ser zero ou positivo.' };
            }
            payload.valorParcela = valorParcela;
        }

        const valorRaw = source.valorFinal.trim();
        if (valorRaw) {
            const valor = Number(valorRaw);
            if (!Number.isFinite(valor) || valor <= 0) {
                return { ok: false, error: 'Valor final deve ser maior que zero.' };
            }
            payload.valorFinal = valor;
        }

        const mensagemTemplate = source.mensagemTemplate.trim();
        if (mensagemTemplate) {
            payload.mensagemTemplate = mensagemTemplate;
        }

        const minicustos = source.minicustosDesativados
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
        if (minicustos.length > 0) {
            payload.minicustosDesativados = [...new Set(minicustos)];
        }

        if (source.dataInicioCuidado.trim()) payload.dataInicioCuidado = source.dataInicioCuidado.trim();
        if (source.dataFimCuidado.trim()) payload.dataFimCuidado = source.dataFimCuidado.trim();
        if (source.periodicidade.trim()) payload.periodicidade = source.periodicidade.trim();
        if (source.tempoCuidadoDescricao.trim()) payload.tempoCuidadoDescricao = source.tempoCuidadoDescricao.trim();
        if (source.alocacaoResumo.trim()) payload.alocacaoResumo = source.alocacaoResumo.trim();

        const diasAtendimento = source.diasAtendimento
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
        if (diasAtendimento.length > 0) {
            payload.diasAtendimento = [...new Set(diasAtendimento)];
        }

        if (source.semanasPlanejadas.trim()) {
            const semanas = Number(source.semanasPlanejadas);
            if (!Number.isFinite(semanas) || semanas <= 0) {
                return { ok: false, error: 'Semanas planejadas deve ser maior que zero.' };
            }
            payload.semanasPlanejadas = semanas;
        }

        if (source.mesesPlanejados.trim()) {
            const meses = Number(source.mesesPlanejados);
            if (!Number.isFinite(meses) || meses <= 0) {
                return { ok: false, error: 'Meses planejados deve ser maior que zero.' };
            }
            payload.mesesPlanejados = meses;
        }

        if (source.horasCuidadoDia.trim()) {
            const horas = Number(source.horasCuidadoDia);
            if (!Number.isFinite(horas) || horas < 1 || horas > 24) {
                return { ok: false, error: 'Horas de cuidado/dia deve estar entre 1 e 24.' };
            }
            payload.horasCuidadoDia = horas;
        }

        return { ok: true, payload };
    }

    const confirmDocumentAction = async () => {
        if (!documentModalKind) return;
        if (isDbSchemaBlocked) {
            setError(`Envio bloqueado: schema do banco desatualizado (${dbSchemaStatus.missingColumns.join(', ') || 'campos ausentes'}).`);
            return;
        }
        const parsed = buildDocumentPayload();
        if (!parsed.ok) {
            setError(parsed.error);
            return;
        }

        if (documentPreview?.missingVariables?.length) {
            setError(`Template com variaveis ausentes: ${documentPreview.missingVariables.join(', ')}`);
            return;
        }

        const success = await handleDocumentAction(documentModalKind, parsed.payload);
        if (success) {
            setDocumentModalKind(null);
            setDocumentPreview(null);
        }
    };

    const parsedDetails = useMemo(() => {
        if (!avaliacao?.dadosDetalhados) return null;
        try {
            return JSON.stringify(JSON.parse(avaliacao.dadosDetalhados), null, 2);
        } catch {
            return avaliacao.dadosDetalhados;
        }
    }, [avaliacao?.dadosDetalhados]);

    if (loading) {
        return <div className="p-6 lg:p-8 text-sm text-muted-foreground">Loading avaliacao...</div>;
    }

    if (error && !avaliacao) {
        return (
            <div className="p-6 lg:p-8 space-y-4">
                <PageHeader
                    title="Avaliacao"
                    description={error}
                    breadcrumbs={[
                        { label: 'Dashboard', href: '/admin/dashboard' },
                        { label: 'Avaliacoes', href: '/admin/avaliacoes' },
                        { label: 'Detail' },
                    ]}
                />
                <Card>
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-error-600">{error}</p>
                        <Link href="/admin/avaliacoes">
                            <Button size="sm" variant="outline">
                                <ArrowLeft className="h-4 w-4" />
                                Back
                            </Button>
                        </Link>
                    </div>
                </Card>
            </div>
        );
    }

    if (!avaliacao) {
        return null;
    }

    return (
        <div className="p-6 lg:p-8 space-y-4">
            <PageHeader
                title={`Avaliacao ${avaliacao.id}`}
                description={avaliacao.paciente?.nome || 'Paciente'}
                breadcrumbs={[
                    { label: 'Dashboard', href: '/admin/dashboard' },
                    { label: 'Avaliacoes', href: '/admin/avaliacoes' },
                    { label: avaliacao.id },
                ]}
                actions={(
                    <Link href="/admin/avaliacoes">
                        <Button size="sm" variant="outline">
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </Button>
                    </Link>
                )}
            />

            {error ? (
                <Card>
                    <p className="text-sm text-error-600">{error}</p>
                </Card>
            ) : null}

            {isDbSchemaBlocked ? (
                <Card>
                    <p className="text-sm text-error-700">
                        Envio de proposta/contrato bloqueado: schema do banco desatualizado.
                    </p>
                    <p className="mt-1 text-xs text-error-600">
                        Missing columns: {dbSchemaStatus.missingColumns.join(', ') || 'nao informado'}.
                    </p>
                </Card>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-3">
                <Card>
                    <p className="mb-2 text-xs uppercase text-muted-foreground">Paciente</p>
                    <p className="font-medium text-foreground">{avaliacao.paciente?.nome || 'Sem nome'}</p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-foreground">
                        <Phone className="h-4 w-4" />
                        {avaliacao.paciente?.telefone}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {avaliacao.paciente?.cidade || '-'} {avaliacao.paciente?.bairro ? `- ${avaliacao.paciente.bairro}` : ''}
                    </p>
                </Card>

                <Card>
                    <p className="mb-2 text-xs uppercase text-muted-foreground">Status</p>
                    <Badge variant={STATUS_VARIANT[avaliacao.status] || 'default'}>{avaliacao.status}</Badge>
                    <div className="mt-3 space-y-1 text-sm text-foreground">
                        <p>Created: {safeFormatDate(avaliacao.createdAt)}</p>
                        <p>Validated: {safeFormatDate(avaliacao.validadoEm)}</p>
                    </div>
                </Card>

                <Card>
                    <p className="mb-2 text-xs uppercase text-muted-foreground">WhatsApp Tracking</p>
                    <p className="text-sm text-foreground">Sent: {avaliacao.whatsappEnviado ? 'yes' : 'no'}</p>
                    <p className="text-sm text-foreground">Sent At: {safeFormatDate(avaliacao.whatsappEnviadoEm)}</p>
                    <p className="text-sm text-foreground">Message ID: {avaliacao.whatsappMessageId || '-'}</p>
                    {avaliacao.whatsappErro ? (
                        <p className="mt-2 rounded bg-error-50 p-2 text-xs text-error-600">{avaliacao.whatsappErro}</p>
                    ) : null}
                </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <p className="mb-3 text-xs uppercase text-muted-foreground">Acoes</p>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={isDbSchemaBlocked || !canSendProposta || !!actionState}
                            isLoading={actionState === 'proposta'}
                            onClick={() => openDocumentModal('proposta')}
                        >
                            <FileText className="h-4 w-4" />
                            Enviar Proposta
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={isDbSchemaBlocked || !canSendContrato || !!actionState}
                            isLoading={actionState === 'contrato'}
                            onClick={() => openDocumentModal('contrato')}
                        >
                            <FileText className="h-4 w-4" />
                            Enviar Contrato
                        </Button>
                        <Link
                            href={`/admin/orcamentos/novo?avaliacaoId=${avaliacao.id}`}
                            className={`inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium transition-colors ${
                                canManageOrcamentos
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    : 'cursor-not-allowed bg-surface-subtle text-muted-foreground'
                            }`}
                            aria-disabled={!canManageOrcamentos}
                            onClick={(event) => {
                                if (!canManageOrcamentos) event.preventDefault();
                            }}
                        >
                            Criar Orcamento
                        </Link>
                        <Button
                            size="sm"
                            disabled={!!actionState}
                            isLoading={actionState === 'aprovar'}
                            onClick={() => handleStatusAction('aprovar')}
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            Aprovar
                        </Button>
                        <Button
                            size="sm"
                            variant="danger"
                            disabled={!!actionState}
                            isLoading={actionState === 'rejeitar'}
                            onClick={() => handleStatusAction('rejeitar')}
                        >
                            <XCircle className="h-4 w-4" />
                            Rejeitar
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            disabled={!!actionState}
                            isLoading={actionState === 'concluir'}
                            onClick={() => handleStatusAction('concluir')}
                        >
                            Concluir
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => router.push(`/admin/whatsapp/chats?phone=${encodeURIComponent(avaliacao.paciente.telefone)}`)}
                        >
                            <MessageCircle className="h-4 w-4" />
                            Abrir chat
                        </Button>
                    </div>
                </Card>

                <Card>
                    <p className="mb-2 text-xs uppercase text-muted-foreground">Resumo Clinico</p>
                    <p className="text-sm text-foreground">Nivel sugerido: {avaliacao.nivelSugerido || '-'}</p>
                    <p className="text-sm text-foreground">Carga sugerida: {avaliacao.cargaSugerida || '-'}</p>
                    <p className="text-sm text-foreground">Valor proposto: {avaliacao.valorProposto || '-'}</p>
                </Card>
            </div>

            {parsedDetails ? (
                <Card>
                    <p className="mb-2 text-xs uppercase text-muted-foreground">Dados detalhados</p>
                    <pre className="max-h-[420px] overflow-auto rounded-lg bg-neutral-900 p-4 text-xs text-green-300">
                        {parsedDetails}
                    </pre>
                </Card>
            ) : null}

            <Card>
                <p className="mb-3 text-xs uppercase text-muted-foreground">Historico de Acoes</p>
                {!canViewLogs ? (
                    <p className="text-sm text-muted-foreground">Role sem permissao para visualizar logs.</p>
                ) : logs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum log correlato encontrado.</p>
                ) : (
                    <div className="space-y-2">
                        {logs.map((entry) => (
                            <div key={entry.id} className="rounded-lg border border-border p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <Badge variant={LOG_TYPE_BADGE[entry.type] || 'default'}>{entry.type}</Badge>
                                        <span className="text-xs font-mono text-foreground">{entry.action}</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{safeFormatDate(entry.createdAt)}</span>
                                </div>
                                <p className="mt-2 text-sm text-foreground">{entry.message}</p>
                                <Link href={`/admin/logs/${entry.id}`} className="mt-2 inline-block text-xs text-primary hover:underline">
                                    Open log detail
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {documentModalKind ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/40"
                        onClick={() => {
                            setDocumentModalKind(null);
                            setDocumentPreview(null);
                        }}
                        aria-label="Fechar modal"
                    />
                    <div className="relative z-10 w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-2xl">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-semibold text-foreground">
                                    Configurar envio de {documentModalKind === 'proposta' ? 'proposta' : 'contrato'}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Ajuste as opcoes antes de enfileirar o documento no WhatsApp.
                                </p>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setDocumentModalKind(null);
                                    setDocumentPreview(null);
                                }}
                            >
                                Fechar
                            </Button>
                        </div>

                        <div className="space-y-3">
                            <label className="block text-sm">
                                <span className="mb-1 block font-medium text-foreground">Orcamento</span>
                                <select
                                    value={documentOptions.orcamentoId}
                                    onChange={(event) => {
                                        const selectedId = event.target.value;
                                        const selectedOrcamento = (avaliacao?.paciente?.orcamentos || [])
                                            .find((item) => item.id === selectedId);
                                        if (!selectedOrcamento && !selectedId) {
                                            const latest = avaliacao?.paciente?.orcamentos?.[0];
                                            const next = buildDocumentOptionsFromOrcamento(latest);
                                            setDocumentOptions(next);
                                            if (documentModalKind) {
                                                void fetchDocumentPreview(documentModalKind, next);
                                            }
                                            return;
                                        }
                                        const next = buildDocumentOptionsFromOrcamento(selectedOrcamento);
                                        setDocumentOptions(next);
                                        if (documentModalKind) {
                                            void fetchDocumentPreview(documentModalKind, next);
                                        }
                                    }}
                                    className="w-full rounded-lg border border-border-hover px-3 py-2 text-sm"
                                >
                                    <option value="">Mais recente do paciente</option>
                                    {(avaliacao?.paciente?.orcamentos || []).map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.id} - {item.status} - {item.valorFinal ? item.valorFinal.toFixed(2) : 'sem valor'}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="block text-sm">
                                    <span className="mb-1 block font-medium text-foreground">Cenario</span>
                                    <select
                                        value={documentOptions.cenarioSelecionado}
                                        onChange={(event) => setDocumentOptions((prev) => ({
                                            ...prev,
                                            cenarioSelecionado: sanitizeScenarioKey(event.target.value),
                                        }))}
                                        className="w-full rounded-lg border border-border-hover px-3 py-2 text-sm"
                                    >
                                        <option value="economico">Economico</option>
                                        <option value="recomendado">Recomendado</option>
                                        <option value="premium">Premium</option>
                                    </select>
                                </label>

                                <label className="block text-sm">
                                    <span className="mb-1 block font-medium text-foreground">Desconto manual (%)</span>
                                    <input
                                        value={documentOptions.descontoManualPercent}
                                        onChange={(event) => setDocumentOptions((prev) => ({ ...prev, descontoManualPercent: event.target.value }))}
                                        type="number"
                                        min={0}
                                        max={100}
                                        step="0.01"
                                        className="w-full rounded-lg border border-border-hover px-3 py-2 text-sm"
                                    />
                                </label>
                            </div>

                            <div className="grid gap-3 md:grid-cols-3">
                                <label className="block text-sm">
                                    <span className="mb-1 block font-medium text-foreground">Valor do periodo (R$)</span>
                                    <input
                                        value={documentOptions.valorPeriodo}
                                        onChange={(event) => setDocumentOptions((prev) => ({ ...prev, valorPeriodo: event.target.value }))}
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        className="w-full rounded-lg border border-border-hover px-3 py-2 text-sm"
                                    />
                                </label>
                                <label className="block text-sm">
                                    <span className="mb-1 block font-medium text-foreground">Data vencimento</span>
                                    <input
                                        type="date"
                                        value={documentOptions.dataVencimento}
                                        onChange={(event) => setDocumentOptions((prev) => ({ ...prev, dataVencimento: event.target.value }))}
                                        className="w-full rounded-lg border border-border-hover px-3 py-2 text-sm"
                                    />
                                </label>
                                <label className="block text-sm">
                                    <span className="mb-1 block font-medium text-foreground">Valor final (R$/semana)</span>
                                    <input
                                        value={documentOptions.valorFinal}
                                        onChange={(event) => setDocumentOptions((prev) => ({ ...prev, valorFinal: event.target.value }))}
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        className="w-full rounded-lg border border-border-hover px-3 py-2 text-sm"
                                    />
                                </label>
                            </div>

                            <div className="grid gap-3 md:grid-cols-3">
                                <label className="block text-sm">
                                    <span className="mb-1 block font-medium text-foreground">Descontos (R$)</span>
                                    <input
                                        value={documentOptions.descontoValor}
                                        onChange={(event) => setDocumentOptions((prev) => ({ ...prev, descontoValor: event.target.value }))}
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        className="w-full rounded-lg border border-border-hover px-3 py-2 text-sm"
                                    />
                                </label>
                                <label className="block text-sm">
                                    <span className="mb-1 block font-medium text-foreground">Acrescimos (R$)</span>
                                    <input
                                        value={documentOptions.acrescimosValor}
                                        onChange={(event) => setDocumentOptions((prev) => ({ ...prev, acrescimosValor: event.target.value }))}
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        className="w-full rounded-lg border border-border-hover px-3 py-2 text-sm"
                                    />
                                </label>
                                <label className="block text-sm">
                                    <span className="mb-1 block font-medium text-foreground">Parcelas</span>
                                    <input
                                        value={documentOptions.parcelas}
                                        onChange={(event) => setDocumentOptions((prev) => ({ ...prev, parcelas: event.target.value }))}
                                        type="number"
                                        min={1}
                                        max={24}
                                        className="w-full rounded-lg border border-border-hover px-3 py-2 text-sm"
                                    />
                                </label>
                            </div>

                            <div className="grid gap-3 md:grid-cols-3">
                                <label className="block text-sm">
                                    <span className="mb-1 block font-medium text-foreground">Entrada (R$)</span>
                                    <input
                                        value={documentOptions.entrada}
                                        onChange={(event) => setDocumentOptions((prev) => ({ ...prev, entrada: event.target.value }))}
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        className="w-full rounded-lg border border-border-hover px-3 py-2 text-sm"
                                    />
                                </label>
                                <label className="block text-sm">
                                    <span className="mb-1 block font-medium text-foreground">Valor da parcela (R$)</span>
                                    <input
                                        value={documentOptions.valorParcela}
                                        onChange={(event) => setDocumentOptions((prev) => ({ ...prev, valorParcela: event.target.value }))}
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        className="w-full rounded-lg border border-border-hover px-3 py-2 text-sm"
                                    />
                                </label>
                                <label className="block text-sm">
                                    <span className="mb-1 block font-medium text-foreground">Minicustos desativados</span>
                                    <input
                                        value={documentOptions.minicustosDesativados}
                                        onChange={(event) => setDocumentOptions((prev) => ({ ...prev, minicustosDesativados: event.target.value }))}
                                        placeholder="RESERVA_TECNICA, VISITA_SUPERVISAO"
                                        className="w-full rounded-lg border border-border-hover px-3 py-2 text-sm"
                                    />
                                </label>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="block text-sm">
                                    <span className="mb-1 block font-medium text-foreground">Metodos (csv)</span>
                                    <input
                                        value={documentOptions.metodosPagamento}
                                        onChange={(event) => setDocumentOptions((prev) => ({ ...prev, metodosPagamento: event.target.value }))}
                                        placeholder="PIX, CARTAO DE CREDITO"
                                        className="w-full rounded-lg border border-border-hover px-3 py-2 text-sm"
                                    />
                                </label>
                                <label className="block text-sm">
                                    <span className="mb-1 block font-medium text-foreground">Forma de pagamento (csv)</span>
                                    <input
                                        value={documentOptions.opcoesParcelamento}
                                        onChange={(event) => setDocumentOptions((prev) => ({ ...prev, opcoesParcelamento: event.target.value }))}
                                        placeholder="1x sem juros, 2x sem juros, 3x sem juros, 4x sem juros"
                                        className="w-full rounded-lg border border-border-hover px-3 py-2 text-sm"
                                    />
                                </label>
                            </div>

                            <div className="rounded-lg border border-border bg-background p-3">
                                <p className="mb-2 text-sm font-medium text-foreground">Planejamento 360 (datas e alocacao)</p>

                                <div className="grid gap-3 md:grid-cols-3">
                                    <label className="block text-sm">
                                        <span className="mb-1 block font-medium text-foreground">Inicio</span>
                                        <input
                                            type="date"
                                            value={documentOptions.dataInicioCuidado}
                                            onChange={(event) => setDocumentOptions((prev) => ({ ...prev, dataInicioCuidado: event.target.value }))}
                                            className="w-full rounded-lg border border-border-hover px-3 py-2 text-sm"
                                        />
                                    </label>
                                    <label className="block text-sm">
                                        <span className="mb-1 block font-medium text-foreground">Fim</span>
                                        <input
                                            type="date"
                                            value={documentOptions.dataFimCuidado}
                                            onChange={(event) => setDocumentOptions((prev) => ({ ...prev, dataFimCuidado: event.target.value }))}
                                            className="w-full rounded-lg border border-border-hover px-3 py-2 text-sm"
                                        />
                                    </label>
                                    <label className="block text-sm">
                                        <span className="mb-1 block font-medium text-foreground">Periodicidade</span>
                                        <select
                                            value={documentOptions.periodicidade}
                                            onChange={(event) => setDocumentOptions((prev) => ({ ...prev, periodicidade: event.target.value }))}
                                            className="w-full rounded-lg border border-border-hover px-3 py-2 text-sm"
                                        >
                                            <option value="DIARIO">Diario</option>
                                            <option value="SEMANAL">Semanal</option>
                                            <option value="QUINZENAL">Quinzenal</option>
                                            <option value="MENSAL">Mensal</option>
                                        </select>
                                    </label>
                                </div>

                                <div className="mt-3 grid gap-3 md:grid-cols-3">
                                    <label className="block text-sm">
                                        <span className="mb-1 block font-medium text-foreground">Semanas</span>
                                        <input
                                            value={documentOptions.semanasPlanejadas}
                                            onChange={(event) => setDocumentOptions((prev) => ({ ...prev, semanasPlanejadas: event.target.value }))}
                                            placeholder="4"
                                            type="number"
                                            min={1}
                                            className="w-full rounded-lg border border-border-hover px-3 py-2 text-sm"
                                        />
                                    </label>
                                    <label className="block text-sm">
                                        <span className="mb-1 block font-medium text-foreground">Meses</span>
                                        <input
                                            value={documentOptions.mesesPlanejados}
                                            onChange={(event) => setDocumentOptions((prev) => ({ ...prev, mesesPlanejados: event.target.value }))}
                                            placeholder="1"
                                            type="number"
                                            min={1}
                                            className="w-full rounded-lg border border-border-hover px-3 py-2 text-sm"
                                        />
                                    </label>
                                    <label className="block text-sm">
                                        <span className="mb-1 block font-medium text-foreground">Horas/dia</span>
                                        <input
                                            value={documentOptions.horasCuidadoDia}
                                            onChange={(event) => setDocumentOptions((prev) => ({ ...prev, horasCuidadoDia: event.target.value }))}
                                            placeholder="12"
                                            type="number"
                                            min={1}
                                            max={24}
                                            className="w-full rounded-lg border border-border-hover px-3 py-2 text-sm"
                                        />
                                    </label>
                                </div>

                                <div className="mt-3 grid gap-3 md:grid-cols-2">
                                    <label className="block text-sm">
                                        <span className="mb-1 block font-medium text-foreground">Dias (csv)</span>
                                        <input
                                            value={documentOptions.diasAtendimento}
                                            onChange={(event) => setDocumentOptions((prev) => ({ ...prev, diasAtendimento: event.target.value }))}
                                            placeholder="seg,ter,qua,qui,sex"
                                            className="w-full rounded-lg border border-border-hover px-3 py-2 text-sm"
                                        />
                                    </label>
                                    <label className="block text-sm">
                                        <span className="mb-1 block font-medium text-foreground">Tempo de cuidado</span>
                                        <input
                                            value={documentOptions.tempoCuidadoDescricao}
                                            onChange={(event) => setDocumentOptions((prev) => ({ ...prev, tempoCuidadoDescricao: event.target.value }))}
                                            placeholder="12h/dia por 3 meses"
                                            className="w-full rounded-lg border border-border-hover px-3 py-2 text-sm"
                                        />
                                    </label>
                                </div>

                                <label className="mt-3 block text-sm">
                                    <span className="mb-1 block font-medium text-foreground">Resumo de alocacao</span>
                                    <textarea
                                        value={documentOptions.alocacaoResumo}
                                        onChange={(event) => setDocumentOptions((prev) => ({ ...prev, alocacaoResumo: event.target.value }))}
                                        placeholder="Escala, cobertura, substituicoes..."
                                        className="h-20 w-full rounded-lg border border-border-hover px-3 py-2 text-sm"
                                    />
                                </label>
                            </div>

                            <div className="rounded-lg border border-border bg-background p-3">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <p className="text-sm font-medium text-foreground">Template da mensagem</p>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            if (!documentModalKind) return;
                                            void fetchDocumentPreview(documentModalKind, documentOptions);
                                        }}
                                        isLoading={previewLoading}
                                        disabled={previewLoading}
                                    >
                                        Atualizar preview
                                    </Button>
                                </div>
                                <textarea
                                    value={documentOptions.mensagemTemplate}
                                    onChange={(event) => setDocumentOptions((prev) => ({ ...prev, mensagemTemplate: event.target.value }))}
                                    className="h-44 w-full rounded-lg border border-border-hover px-3 py-2 text-sm font-mono"
                                    placeholder="Edite o template com placeholders, ex.: {{nome}}, {{investimentoTotal}}"
                                />
                                {documentPreview?.missingVariables?.length ? (
                                    <p className="mt-2 text-xs text-warning-600">
                                        Variaveis ausentes no template: {documentPreview.missingVariables.join(', ')}
                                    </p>
                                ) : null}
                            </div>

                            <div className="rounded-lg border border-border p-3">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <p className="text-sm font-medium text-foreground">Preview da mensagem final</p>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={openDocumentPdfPreview}
                                        isLoading={pdfPreviewLoading}
                                        disabled={!documentPreview}
                                    >
                                        Abrir preview PDF
                                    </Button>
                                </div>
                                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-neutral-900 p-3 text-xs text-green-300">
                                    {documentPreview?.previewMessage || 'Clique em "Atualizar preview" para visualizar a mensagem.'}
                                </pre>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button
                                    className="flex-1"
                                    onClick={confirmDocumentAction}
                                    isLoading={actionState === documentModalKind}
                                >
                                    Confirmar e enfileirar
                                </Button>
                                <Button
                                    className="flex-1"
                                    variant="outline"
                                    onClick={() => {
                                        setDocumentModalKind(null);
                                        setDocumentPreview(null);
                                    }}
                                    disabled={!!actionState}
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
