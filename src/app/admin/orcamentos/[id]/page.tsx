'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, FileText, RefreshCw, Send, SlidersHorizontal, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface OrcamentoDetalhe {
    id: string;
    status: string;
    cenarioEconomico?: string | null;
    cenarioRecomendado?: string | null;
    cenarioPremium?: string | null;
    cenarioSelecionado?: string | null;
    valorFinal?: number | null;
    descontoManualPercent?: number | null;
    minicustosDesativados?: string | null;
    snapshotInput?: string | null;
    enviadoEm?: string | null;
    aceitoEm?: string | null;
    createdAt: string;
    paciente: {
        id: string;
        nome?: string | null;
        telefone: string;
        cidade?: string | null;
        bairro?: string | null;
    };
}

interface CenarioResumo {
    nome?: string;
    totalSemanal: number;
    estimativaMensal: number;
    plantoes?: unknown[];
}

type OrcamentoScenarioKey = 'economico' | 'recomendado' | 'premium';
type ConfiguredAction = 'preview-proposta' | 'preview-contrato' | 'send-proposta' | 'send-contrato';

interface SendOptionsFormState {
    cenarioSelecionado: OrcamentoScenarioKey;
    descontoManualPercent: string;
    valorFinal: string;
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

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'> = {
    RASCUNHO: 'default',
    APROVADO: 'info',
    ENVIADO: 'warning',
    PROPOSTA_ENVIADA: 'purple',
    CONTRATO_ENVIADO: 'purple',
    ACEITO: 'success',
    RECUSADO: 'error',
    CANCELADO: 'error',
};

function formatCurrency(value?: number | null) {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateStr?: string | null) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('pt-BR');
}

function sanitizeScenarioKey(value?: string | null): OrcamentoScenarioKey {
    const normalized = String(value || 'recomendado').trim().toLowerCase();
    if (normalized === 'economico') return 'economico';
    if (normalized === 'premium') return 'premium';
    return 'recomendado';
}

function parseCenario(json?: string | null): CenarioResumo | null {
    if (!json || !json.trim()) return null;
    try {
        const parsed = JSON.parse(json) as Record<string, unknown>;
        const totalSemanal = Number(parsed.totalSemanal);
        const estimativaMensal = Number(parsed.estimativaMensal);
        if (!Number.isFinite(totalSemanal) || !Number.isFinite(estimativaMensal)) return null;
        return {
            nome: typeof parsed.nome === 'string' ? parsed.nome : undefined,
            totalSemanal,
            estimativaMensal,
            plantoes: Array.isArray(parsed.plantoes) ? parsed.plantoes : undefined,
        };
    } catch {
        return null;
    }
}

function parseMinicustosStored(raw?: string | null): string {
    if (!raw || !raw.trim()) return '';
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
            return parsed.map((item) => String(item || '').trim()).filter(Boolean).join(', ');
        }
    } catch {
        // ignore and fallback to raw string
    }
    return raw;
}

function parsePlanningFromSnapshot(raw?: string | null): Partial<SendOptionsFormState> {
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

function buildActionTitle(action: ConfiguredAction): string {
    if (action === 'preview-proposta') return 'Configurar Preview da Proposta';
    if (action === 'preview-contrato') return 'Configurar Preview do Contrato';
    if (action === 'send-proposta') return 'Configurar Envio da Proposta';
    return 'Configurar Envio do Contrato';
}

function loadingKeyFromAction(action: ConfiguredAction): 'gerar-proposta' | 'gerar-contrato' | 'enviar-proposta' | 'enviar-contrato' {
    if (action === 'preview-proposta') return 'gerar-proposta';
    if (action === 'preview-contrato') return 'gerar-contrato';
    if (action === 'send-proposta') return 'enviar-proposta';
    return 'enviar-contrato';
}

export default function OrcamentoDetalhePage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();

    const [orcamento, setOrcamento] = useState<OrcamentoDetalhe | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [configuredAction, setConfiguredAction] = useState<ConfiguredAction | null>(null);
    const [optionsForm, setOptionsForm] = useState<SendOptionsFormState>({
        cenarioSelecionado: 'recomendado',
        descontoManualPercent: '',
        valorFinal: '',
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

    const scenarioSummaries = useMemo(() => ({
        economico: parseCenario(orcamento?.cenarioEconomico),
        recomendado: parseCenario(orcamento?.cenarioRecomendado),
        premium: parseCenario(orcamento?.cenarioPremium),
    }), [orcamento?.cenarioEconomico, orcamento?.cenarioRecomendado, orcamento?.cenarioPremium]);

    async function fetchOrcamento() {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/admin/orcamentos/${params.id}`);
            const payload = await response.json().catch(() => ({}));

            if (!response.ok || !payload?.success) {
                setError(payload?.error || 'Falha ao carregar orcamento.');
                setOrcamento(null);
                return;
            }

            setOrcamento(payload.orcamento || null);
        } catch {
            setError('Falha ao carregar orcamento.');
            setOrcamento(null);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchOrcamento();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.id]);

    async function openPdf(
        endpoint: 'gerar-proposta' | 'gerar-contrato',
        payload?: Record<string, unknown>,
    ): Promise<boolean> {
        setActionLoading(endpoint);
        try {
            const response = await fetch(`/api/admin/orcamentos/${params.id}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload || {}),
            });
            if (!response.ok) {
                const responsePayload = await response.json().catch(() => ({}));
                setError(responsePayload?.error || 'Falha ao gerar PDF.');
                return false;
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank', 'noopener,noreferrer');
            setTimeout(() => URL.revokeObjectURL(url), 5000);
            return true;
        } finally {
            setActionLoading(null);
        }
    }

    async function runAction(
        action: 'enviar-proposta' | 'enviar-contrato' | 'aceitar' | 'cancelar',
        payload?: Record<string, unknown>,
    ): Promise<boolean> {
        setActionLoading(action);
        setError(null);

        try {
            let url = `/api/admin/orcamentos/${params.id}`;
            let method: 'PATCH' | 'POST' = 'PATCH';
            let body: Record<string, unknown> = {};

            if (action === 'enviar-proposta') {
                url = `/api/admin/orcamentos/${params.id}/enviar-proposta`;
                method = 'POST';
                body = payload || {};
            } else if (action === 'enviar-contrato') {
                url = `/api/admin/orcamentos/${params.id}/enviar-contrato`;
                method = 'POST';
                body = payload || {};
            } else {
                body = { action };
            }

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const responsePayload = await response.json().catch(() => ({}));
            if (!response.ok || responsePayload?.success === false) {
                setError(responsePayload?.error || 'Falha ao executar acao.');
                return false;
            }

            await fetchOrcamento();
            return true;
        } finally {
            setActionLoading(null);
        }
    }

    function openConfiguredAction(action: ConfiguredAction) {
        if (!orcamento) return;
        setError(null);
        const planning = parsePlanningFromSnapshot(orcamento.snapshotInput);
        setOptionsForm({
            cenarioSelecionado: sanitizeScenarioKey(orcamento.cenarioSelecionado),
            descontoManualPercent: orcamento.descontoManualPercent !== null && orcamento.descontoManualPercent !== undefined
                ? String(orcamento.descontoManualPercent)
                : '',
            valorFinal: orcamento.valorFinal !== null && orcamento.valorFinal !== undefined
                ? String(orcamento.valorFinal)
                : '',
            minicustosDesativados: parseMinicustosStored(orcamento.minicustosDesativados),
            dataInicioCuidado: planning.dataInicioCuidado || '',
            dataFimCuidado: planning.dataFimCuidado || '',
            periodicidade: planning.periodicidade || 'SEMANAL',
            semanasPlanejadas: planning.semanasPlanejadas || '',
            mesesPlanejados: planning.mesesPlanejados || '',
            horasCuidadoDia: planning.horasCuidadoDia || '',
            diasAtendimento: planning.diasAtendimento || '',
            tempoCuidadoDescricao: planning.tempoCuidadoDescricao || '',
            alocacaoResumo: planning.alocacaoResumo || '',
        });
        setConfiguredAction(action);
    }

    function buildSendPayload():
        { ok: true; payload: Record<string, unknown> } | { ok: false; error: string } {
        const payload: Record<string, unknown> = {
            cenarioSelecionado: optionsForm.cenarioSelecionado,
        };

        const descontoRaw = optionsForm.descontoManualPercent.trim();
        if (descontoRaw) {
            const desconto = Number(descontoRaw);
            if (!Number.isFinite(desconto) || desconto < 0 || desconto > 100) {
                return { ok: false, error: 'Desconto manual deve estar entre 0 e 100.' };
            }
            payload.descontoManualPercent = desconto;
        }

        const valorRaw = optionsForm.valorFinal.trim();
        if (valorRaw) {
            const valor = Number(valorRaw);
            if (!Number.isFinite(valor) || valor <= 0) {
                return { ok: false, error: 'Valor final deve ser maior que zero.' };
            }
            payload.valorFinal = valor;
        }

        const minicustos = optionsForm.minicustosDesativados
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
        if (minicustos.length > 0) {
            payload.minicustosDesativados = [...new Set(minicustos)];
        }

        if (optionsForm.dataInicioCuidado.trim()) payload.dataInicioCuidado = optionsForm.dataInicioCuidado.trim();
        if (optionsForm.dataFimCuidado.trim()) payload.dataFimCuidado = optionsForm.dataFimCuidado.trim();
        if (optionsForm.periodicidade.trim()) payload.periodicidade = optionsForm.periodicidade.trim();
        if (optionsForm.tempoCuidadoDescricao.trim()) payload.tempoCuidadoDescricao = optionsForm.tempoCuidadoDescricao.trim();
        if (optionsForm.alocacaoResumo.trim()) payload.alocacaoResumo = optionsForm.alocacaoResumo.trim();

        const diasAtendimento = optionsForm.diasAtendimento
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
        if (diasAtendimento.length > 0) {
            payload.diasAtendimento = [...new Set(diasAtendimento)];
        }

        if (optionsForm.semanasPlanejadas.trim()) {
            const semanas = Number(optionsForm.semanasPlanejadas);
            if (!Number.isFinite(semanas) || semanas <= 0) {
                return { ok: false, error: 'Semanas planejadas deve ser maior que zero.' };
            }
            payload.semanasPlanejadas = semanas;
        }

        if (optionsForm.mesesPlanejados.trim()) {
            const meses = Number(optionsForm.mesesPlanejados);
            if (!Number.isFinite(meses) || meses <= 0) {
                return { ok: false, error: 'Meses planejados deve ser maior que zero.' };
            }
            payload.mesesPlanejados = meses;
        }

        if (optionsForm.horasCuidadoDia.trim()) {
            const horas = Number(optionsForm.horasCuidadoDia);
            if (!Number.isFinite(horas) || horas < 1 || horas > 24) {
                return { ok: false, error: 'Horas de cuidado/dia deve estar entre 1 e 24.' };
            }
            payload.horasCuidadoDia = horas;
        }

        return { ok: true, payload };
    }

    async function confirmConfiguredAction() {
        if (!configuredAction) return;

        const parsed = buildSendPayload();
        if (!parsed.ok) {
            setError(parsed.error);
            return;
        }

        const action = configuredAction;
        const payload = parsed.payload;
        let success = false;

        if (action === 'preview-proposta') {
            success = await openPdf('gerar-proposta', payload);
        } else if (action === 'preview-contrato') {
            success = await openPdf('gerar-contrato', payload);
        } else if (action === 'send-proposta') {
            success = await runAction('enviar-proposta', payload);
        } else if (action === 'send-contrato') {
            success = await runAction('enviar-contrato', payload);
        }

        if (success) {
            setConfiguredAction(null);
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Carregando...</div>;
    }

    if (!orcamento) {
        return (
            <div className="p-8">
                <Card>
                    <p className="text-red-600">{error || 'Orcamento nao encontrado.'}</p>
                    <div className="mt-4 flex gap-2">
                        <Button variant="outline" onClick={fetchOrcamento}>
                            <RefreshCw className="h-4 w-4" />
                            Tentar novamente
                        </Button>
                        <Link href="/admin/orcamentos">
                            <Button>Voltar</Button>
                        </Link>
                    </div>
                </Card>
            </div>
        );
    }

    const scenarioCards: Array<{ key: OrcamentoScenarioKey; label: string; data: CenarioResumo | null }> = [
        { key: 'economico', label: 'Economico', data: scenarioSummaries.economico },
        { key: 'recomendado', label: 'Recomendado', data: scenarioSummaries.recomendado },
        { key: 'premium', label: 'Premium', data: scenarioSummaries.premium },
    ];

    return (
        <div className="p-6 lg:p-8">
            <PageHeader
                title={`Orcamento ${orcamento.id}`}
                description={`Paciente: ${orcamento.paciente?.nome || 'Sem nome'}`}
                breadcrumbs={[
                    { label: 'Dashboard', href: '/admin/dashboard' },
                    { label: 'Orcamentos', href: '/admin/orcamentos' },
                    { label: 'Detalhe' },
                ]}
                actions={(
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={fetchOrcamento} isLoading={loading}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Link href="/admin/orcamentos">
                            <Button variant="outline">
                                <ArrowLeft className="h-4 w-4" />
                                Voltar
                            </Button>
                        </Link>
                    </div>
                )}
            />

            {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                <Card>
                    <h3 className="mb-3 font-semibold">Resumo</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Status</span>
                            <Badge variant={STATUS_VARIANT[orcamento.status] || 'default'}>{orcamento.status}</Badge>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Valor Final</span>
                            <span className="font-medium">{formatCurrency(orcamento.valorFinal)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Desconto Manual</span>
                            <span>{orcamento.descontoManualPercent !== null && orcamento.descontoManualPercent !== undefined ? `${orcamento.descontoManualPercent}%` : '-'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Cenario</span>
                            <span className="uppercase">{sanitizeScenarioKey(orcamento.cenarioSelecionado)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Criado em</span>
                            <span>{formatDate(orcamento.createdAt)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Enviado em</span>
                            <span>{formatDate(orcamento.enviadoEm)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Aceito em</span>
                            <span>{formatDate(orcamento.aceitoEm)}</span>
                        </div>
                    </div>
                </Card>

                <Card>
                    <h3 className="mb-3 font-semibold">Paciente</h3>
                    <div className="space-y-2 text-sm">
                        <p><strong>Nome:</strong> {orcamento.paciente?.nome || 'Sem nome'}</p>
                        <p><strong>Telefone:</strong> {orcamento.paciente?.telefone}</p>
                        <p><strong>Cidade:</strong> {orcamento.paciente?.cidade || '-'}</p>
                        <p><strong>Bairro:</strong> {orcamento.paciente?.bairro || '-'}</p>
                        <p><strong>Minicustos off:</strong> {parseMinicustosStored(orcamento.minicustosDesativados) || '-'}</p>
                    </div>
                </Card>

                <Card>
                    <h3 className="mb-3 font-semibold">Acoes</h3>
                    <div className="space-y-2">
                        <Button className="w-full justify-start" onClick={() => openConfiguredAction('preview-proposta')} isLoading={actionLoading === 'gerar-proposta'}>
                            <FileText className="h-4 w-4" />
                            Preview Proposta (configuravel)
                        </Button>
                        <Button className="w-full justify-start" variant="outline" onClick={() => openConfiguredAction('preview-contrato')} isLoading={actionLoading === 'gerar-contrato'}>
                            <FileText className="h-4 w-4" />
                            Preview Contrato (configuravel)
                        </Button>
                        <Button className="w-full justify-start bg-purple-600 hover:bg-purple-700" onClick={() => openConfiguredAction('send-proposta')} isLoading={actionLoading === 'enviar-proposta'}>
                            <Send className="h-4 w-4" />
                            Enviar Proposta (Outbox)
                        </Button>
                        <Button className="w-full justify-start bg-indigo-600 hover:bg-indigo-700" onClick={() => openConfiguredAction('send-contrato')} isLoading={actionLoading === 'enviar-contrato'}>
                            <Send className="h-4 w-4" />
                            Enviar Contrato (Outbox)
                        </Button>
                        <Button className="w-full justify-start bg-green-600 hover:bg-green-700" onClick={() => runAction('aceitar')} isLoading={actionLoading === 'aceitar'}>
                            <CheckCircle className="h-4 w-4" />
                            Marcar como Aceito
                        </Button>
                        <Button className="w-full justify-start" variant="danger" onClick={() => runAction('cancelar')} isLoading={actionLoading === 'cancelar'}>
                            <XCircle className="h-4 w-4" />
                            Cancelar Orcamento
                        </Button>
                    </div>
                </Card>
            </div>

            <Card className="mt-6">
                <h3 className="mb-3 font-semibold">Cenarios</h3>
                <div className="grid gap-3 text-sm md:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 p-3">
                        <p className="mb-1 font-medium">Economico</p>
                        <p className="text-slate-600 whitespace-pre-wrap">{orcamento.cenarioEconomico || '-'}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                        <p className="mb-1 font-medium">Recomendado</p>
                        <p className="text-slate-600 whitespace-pre-wrap">{orcamento.cenarioRecomendado || '-'}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                        <p className="mb-1 font-medium">Premium</p>
                        <p className="text-slate-600 whitespace-pre-wrap">{orcamento.cenarioPremium || '-'}</p>
                    </div>
                </div>
            </Card>

            {configuredAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <button
                        type="button"
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setConfiguredAction(null)}
                        aria-label="Fechar configuracao"
                    />
                    <div className="relative z-10 w-full max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl">
                        <div className="mb-4 flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">{buildActionTitle(configuredAction)}</h3>
                                <p className="text-sm text-gray-500">
                                    Ajuste as opcoes antes de gerar ou enviar o documento.
                                </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setConfiguredAction(null)}>
                                <XCircle className="h-4 w-4" />
                                Fechar
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="mb-2 text-sm font-medium text-gray-700">1. Cenario para documento</p>
                                <div className="grid gap-3 md:grid-cols-3">
                                    {scenarioCards.map((scenario) => (
                                        <button
                                            key={scenario.key}
                                            type="button"
                                            onClick={() => setOptionsForm((prev) => ({ ...prev, cenarioSelecionado: scenario.key }))}
                                            className={`rounded-lg border p-3 text-left transition ${
                                                optionsForm.cenarioSelecionado === scenario.key
                                                    ? 'border-emerald-500 bg-emerald-50'
                                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                            }`}
                                        >
                                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{scenario.label}</p>
                                            <p className="mt-2 text-sm font-semibold text-gray-900">
                                                {scenario.data ? formatCurrency(scenario.data.totalSemanal) : 'Sem dados'}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {scenario.data ? `${formatCurrency(scenario.data.estimativaMensal)} / mes` : '-'}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {scenario.data?.plantoes ? `${scenario.data.plantoes.length} plantoes` : ''}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="block text-sm">
                                    <span className="mb-1 block font-medium text-gray-700">2. Desconto manual (%)</span>
                                    <input
                                        value={optionsForm.descontoManualPercent}
                                        onChange={(event) => setOptionsForm((prev) => ({ ...prev, descontoManualPercent: event.target.value }))}
                                        placeholder="Ex.: 5"
                                        type="number"
                                        min={0}
                                        max={100}
                                        step="0.01"
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                    />
                                </label>

                                <label className="block text-sm">
                                    <span className="mb-1 block font-medium text-gray-700">3. Valor final (R$/semana)</span>
                                    <input
                                        value={optionsForm.valorFinal}
                                        onChange={(event) => setOptionsForm((prev) => ({ ...prev, valorFinal: event.target.value }))}
                                        placeholder="Ex.: 3909.67"
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                    />
                                </label>
                            </div>

                            <label className="block text-sm">
                                <span className="mb-1 block font-medium text-gray-700">4. Minicustos desativados (separados por virgula)</span>
                                <input
                                    value={optionsForm.minicustosDesativados}
                                    onChange={(event) => setOptionsForm((prev) => ({ ...prev, minicustosDesativados: event.target.value }))}
                                    placeholder="RESERVA_TECNICA, VISITA_SUPERVISAO"
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                />
                            </label>

                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                                <p className="mb-2 text-sm font-medium text-gray-700">5. Planejamento 360 (datas e alocacao)</p>

                                <div className="grid gap-3 md:grid-cols-3">
                                    <label className="block text-sm">
                                        <span className="mb-1 block font-medium text-gray-700">Inicio</span>
                                        <input
                                            type="date"
                                            value={optionsForm.dataInicioCuidado}
                                            onChange={(event) => setOptionsForm((prev) => ({ ...prev, dataInicioCuidado: event.target.value }))}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                        />
                                    </label>
                                    <label className="block text-sm">
                                        <span className="mb-1 block font-medium text-gray-700">Fim</span>
                                        <input
                                            type="date"
                                            value={optionsForm.dataFimCuidado}
                                            onChange={(event) => setOptionsForm((prev) => ({ ...prev, dataFimCuidado: event.target.value }))}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                        />
                                    </label>
                                    <label className="block text-sm">
                                        <span className="mb-1 block font-medium text-gray-700">Periodicidade</span>
                                        <select
                                            value={optionsForm.periodicidade}
                                            onChange={(event) => setOptionsForm((prev) => ({ ...prev, periodicidade: event.target.value }))}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
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
                                        <span className="mb-1 block font-medium text-gray-700">Semanas</span>
                                        <input
                                            value={optionsForm.semanasPlanejadas}
                                            onChange={(event) => setOptionsForm((prev) => ({ ...prev, semanasPlanejadas: event.target.value }))}
                                            placeholder="4"
                                            type="number"
                                            min={1}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                        />
                                    </label>
                                    <label className="block text-sm">
                                        <span className="mb-1 block font-medium text-gray-700">Meses</span>
                                        <input
                                            value={optionsForm.mesesPlanejados}
                                            onChange={(event) => setOptionsForm((prev) => ({ ...prev, mesesPlanejados: event.target.value }))}
                                            placeholder="1"
                                            type="number"
                                            min={1}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                        />
                                    </label>
                                    <label className="block text-sm">
                                        <span className="mb-1 block font-medium text-gray-700">Horas/dia</span>
                                        <input
                                            value={optionsForm.horasCuidadoDia}
                                            onChange={(event) => setOptionsForm((prev) => ({ ...prev, horasCuidadoDia: event.target.value }))}
                                            placeholder="12"
                                            type="number"
                                            min={1}
                                            max={24}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                        />
                                    </label>
                                </div>

                                <div className="mt-3 grid gap-3 md:grid-cols-2">
                                    <label className="block text-sm">
                                        <span className="mb-1 block font-medium text-gray-700">Dias (csv)</span>
                                        <input
                                            value={optionsForm.diasAtendimento}
                                            onChange={(event) => setOptionsForm((prev) => ({ ...prev, diasAtendimento: event.target.value }))}
                                            placeholder="seg,ter,qua,qui,sex"
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                        />
                                    </label>
                                    <label className="block text-sm">
                                        <span className="mb-1 block font-medium text-gray-700">Tempo de cuidado</span>
                                        <input
                                            value={optionsForm.tempoCuidadoDescricao}
                                            onChange={(event) => setOptionsForm((prev) => ({ ...prev, tempoCuidadoDescricao: event.target.value }))}
                                            placeholder="12h/dia por 3 meses"
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                        />
                                    </label>
                                </div>

                                <label className="mt-3 block text-sm">
                                    <span className="mb-1 block font-medium text-gray-700">Resumo de alocacao</span>
                                    <textarea
                                        value={optionsForm.alocacaoResumo}
                                        onChange={(event) => setOptionsForm((prev) => ({ ...prev, alocacaoResumo: event.target.value }))}
                                        placeholder="Escala, cobertura, troca de profissionais..."
                                        className="h-20 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                    />
                                </label>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                                <span className="inline-flex items-center gap-2">
                                    <SlidersHorizontal className="h-4 w-4" />
                                    Essas opcoes sao usadas no preview e no envio para manter consistencia do documento final.
                                </span>
                                <span className="font-medium uppercase">{optionsForm.cenarioSelecionado}</span>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button
                                    className="flex-1"
                                    onClick={confirmConfiguredAction}
                                    isLoading={actionLoading === loadingKeyFromAction(configuredAction)}
                                >
                                    Confirmar e executar
                                </Button>
                                <Button
                                    className="flex-1"
                                    variant="outline"
                                    onClick={() => setConfiguredAction(null)}
                                    disabled={actionLoading !== null}
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
