'use client';

import { useEffect, useMemo, useState } from 'react';

interface UnitReport {
    unidadeId: string;
    unidadeCodigo: string;
    unidadeNome: string;
    totalOrcamentos: number;
    ticketMedio: number;
    receitaPrevista: number;
    receitaRecorrente: number;
    horasTotaisContratadas: number;
    impactoDescontos: number;
    margemMedia: number;
    simulacaoFutura90d: number;
}

interface ReportResponse {
    global: {
        totalOrcamentos: number;
        ticketMedio: number;
        receitaPrevista: number;
        receitaRecorrente: number;
        horasTotaisContratadas: number;
        impactoDescontos: number;
        margemMedia: number;
    };
    byUnit: UnitReport[];
    summary?: {
        totalHours: number;
        totalRevenue: number;
        totalProviderCost: number;
        grossMargin: number;
        taxTotal: number;
        miniCostsTotal: number;
        avgDiscount: number;
        emergencyCount: number;
        topDiseaseAddons: Array<{ label: string; count: number }>;
    };
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default function RelatorioPrecificacaoPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [report, setReport] = useState<ReportResponse | null>(null);
    const [filters, setFilters] = useState({
        unidade: '',
        contratoTipo: '',
        metodoPagamento: '',
        dateFrom: '',
        dateTo: '',
    });

    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        setError(null);
        const params = new URLSearchParams();
        if (filters.unidade) params.set('unidade', filters.unidade);
        if (filters.contratoTipo) params.set('contrato_tipo', filters.contratoTipo);
        if (filters.metodoPagamento) params.set('metodo_pagamento', filters.metodoPagamento);
        if (filters.dateFrom) params.set('date_from', filters.dateFrom);
        if (filters.dateTo) params.set('date_to', filters.dateTo);

        fetch(`/api/admin/relatorios/precificacao?${params.toString()}`)
            .then(async (response) => {
                const payload = await response.json();
                if (!response.ok || !payload?.success) {
                    throw new Error(payload?.error?.message || 'Falha ao carregar relatorio');
                }
                return payload.data as ReportResponse;
            })
            .then((data) => {
                if (!isMounted) return;
                setReport(data);
            })
            .catch((cause) => {
                if (!isMounted) return;
                setError(cause instanceof Error ? cause.message : 'Erro ao carregar relatorio');
            })
            .finally(() => {
                if (!isMounted) return;
                setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [filters]);

    const cards = useMemo(() => {
        if (!report) return [];
        return [
            { label: 'Receita Prevista', value: BRL.format(report.global.receitaPrevista) },
            { label: 'Receita Recorrente', value: BRL.format(report.global.receitaRecorrente) },
            { label: 'Ticket Medio', value: BRL.format(report.global.ticketMedio) },
            { label: 'Horas Contratadas', value: report.global.horasTotaisContratadas.toFixed(0) },
            { label: 'Margem Media', value: `${report.global.margemMedia.toFixed(2)}%` },
            { label: 'Impacto Descontos', value: BRL.format(report.global.impactoDescontos) },
        ];
    }, [report]);

    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Relatorios de Precificacao</h1>
                <p className="text-sm text-muted-foreground">
                    Margem, receita prevista/recorrente, horas contratadas e simulacao futura por unidade.
                </p>
            </div>

            <div className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-6">
                <input
                    className="rounded border px-2 py-1 text-sm"
                    placeholder="Unidade"
                    value={filters.unidade}
                    onChange={(e) => setFilters((prev) => ({ ...prev, unidade: e.target.value }))}
                />
                <input
                    className="rounded border px-2 py-1 text-sm"
                    placeholder="Contrato tipo"
                    value={filters.contratoTipo}
                    onChange={(e) => setFilters((prev) => ({ ...prev, contratoTipo: e.target.value }))}
                />
                <input
                    className="rounded border px-2 py-1 text-sm"
                    placeholder="Metodo pagamento"
                    value={filters.metodoPagamento}
                    onChange={(e) => setFilters((prev) => ({ ...prev, metodoPagamento: e.target.value }))}
                />
                <input
                    type="date"
                    className="rounded border px-2 py-1 text-sm"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                />
                <input
                    type="date"
                    className="rounded border px-2 py-1 text-sm"
                    value={filters.dateTo}
                    onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                />
                <button
                    type="button"
                    className="rounded bg-neutral-900 px-3 py-1 text-sm font-semibold text-white"
                    onClick={() => {
                        const params = new URLSearchParams();
                        if (filters.unidade) params.set('unidade', filters.unidade);
                        if (filters.contratoTipo) params.set('contrato_tipo', filters.contratoTipo);
                        if (filters.metodoPagamento) params.set('metodo_pagamento', filters.metodoPagamento);
                        if (filters.dateFrom) params.set('date_from', filters.dateFrom);
                        if (filters.dateTo) params.set('date_to', filters.dateTo);
                        params.set('format', 'csv');
                        window.open(`/api/admin/relatorios/precificacao?${params.toString()}`, '_blank');
                    }}
                >
                    Exportar CSV
                </button>
            </div>

            {loading && <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Carregando...</div>}
            {error && <div className="rounded-lg border border-error-100 bg-error-50 p-4 text-sm text-error-700">{error}</div>}

            {!loading && !error && report && (
                <>
                    <div className="grid gap-3 md:grid-cols-3">
                        {cards.map((card) => (
                            <div key={card.label} className="rounded-xl border bg-card p-4 shadow-sm">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
                                <p className="mt-1 text-xl font-semibold text-foreground">{card.value}</p>
                            </div>
                        ))}
                    </div>

                    {report.summary ? (
                        <div className="grid gap-3 md:grid-cols-4">
                            <div className="rounded-xl border bg-card p-4 shadow-sm">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Custo Prestador</p>
                                <p className="mt-1 text-xl font-semibold text-foreground">{BRL.format(report.summary.totalProviderCost)}</p>
                            </div>
                            <div className="rounded-xl border bg-card p-4 shadow-sm">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Impostos</p>
                                <p className="mt-1 text-xl font-semibold text-foreground">{BRL.format(report.summary.taxTotal)}</p>
                            </div>
                            <div className="rounded-xl border bg-card p-4 shadow-sm">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">MiniCustos</p>
                                <p className="mt-1 text-xl font-semibold text-foreground">{BRL.format(report.summary.miniCostsTotal)}</p>
                            </div>
                            <div className="rounded-xl border bg-card p-4 shadow-sm">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Emergenciais</p>
                                <p className="mt-1 text-xl font-semibold text-foreground">{report.summary.emergencyCount}</p>
                            </div>
                        </div>
                    ) : null}

                    <div className="rounded-xl border bg-card shadow-sm">
                        <div className="border-b px-4 py-3 text-sm font-semibold text-foreground">Por unidade</div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-border text-sm">
                                <thead className="bg-background">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium text-foreground">Unidade</th>
                                        <th className="px-4 py-2 text-left font-medium text-foreground">Orcamentos</th>
                                        <th className="px-4 py-2 text-left font-medium text-foreground">Ticket Medio</th>
                                        <th className="px-4 py-2 text-left font-medium text-foreground">Receita Prevista</th>
                                        <th className="px-4 py-2 text-left font-medium text-foreground">Receita Recorrente</th>
                                        <th className="px-4 py-2 text-left font-medium text-foreground">Horas</th>
                                        <th className="px-4 py-2 text-left font-medium text-foreground">Descontos</th>
                                        <th className="px-4 py-2 text-left font-medium text-foreground">Simulacao 90d</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {report.byUnit.map((unit) => (
                                        <tr key={unit.unidadeId}>
                                            <td className="px-4 py-2">
                                                <p className="font-medium text-foreground">{unit.unidadeNome}</p>
                                                <p className="text-xs text-muted-foreground">{unit.unidadeCodigo}</p>
                                            </td>
                                            <td className="px-4 py-2">{unit.totalOrcamentos}</td>
                                            <td className="px-4 py-2">{BRL.format(unit.ticketMedio)}</td>
                                            <td className="px-4 py-2">{BRL.format(unit.receitaPrevista)}</td>
                                            <td className="px-4 py-2">{BRL.format(unit.receitaRecorrente)}</td>
                                            <td className="px-4 py-2">{unit.horasTotaisContratadas.toFixed(0)}h</td>
                                            <td className="px-4 py-2">{BRL.format(unit.impactoDescontos)}</td>
                                            <td className="px-4 py-2">{BRL.format(unit.simulacaoFutura90d)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
