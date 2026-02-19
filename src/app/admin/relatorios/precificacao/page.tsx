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
                <h1 className="text-2xl font-bold text-gray-900">Relatorios de Precificacao</h1>
                <p className="text-sm text-gray-500">
                    Margem, receita prevista/recorrente, horas contratadas e simulacao futura por unidade.
                </p>
            </div>

            <div className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-6">
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
                    className="rounded bg-gray-900 px-3 py-1 text-sm font-semibold text-white"
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

            {loading && <div className="rounded-lg border bg-white p-4 text-sm text-gray-500">Carregando...</div>}
            {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

            {!loading && !error && report && (
                <>
                    <div className="grid gap-3 md:grid-cols-3">
                        {cards.map((card) => (
                            <div key={card.label} className="rounded-xl border bg-white p-4 shadow-sm">
                                <p className="text-xs uppercase tracking-wide text-gray-500">{card.label}</p>
                                <p className="mt-1 text-xl font-semibold text-gray-900">{card.value}</p>
                            </div>
                        ))}
                    </div>

                    {report.summary ? (
                        <div className="grid gap-3 md:grid-cols-4">
                            <div className="rounded-xl border bg-white p-4 shadow-sm">
                                <p className="text-xs uppercase tracking-wide text-gray-500">Custo Prestador</p>
                                <p className="mt-1 text-xl font-semibold text-gray-900">{BRL.format(report.summary.totalProviderCost)}</p>
                            </div>
                            <div className="rounded-xl border bg-white p-4 shadow-sm">
                                <p className="text-xs uppercase tracking-wide text-gray-500">Impostos</p>
                                <p className="mt-1 text-xl font-semibold text-gray-900">{BRL.format(report.summary.taxTotal)}</p>
                            </div>
                            <div className="rounded-xl border bg-white p-4 shadow-sm">
                                <p className="text-xs uppercase tracking-wide text-gray-500">MiniCustos</p>
                                <p className="mt-1 text-xl font-semibold text-gray-900">{BRL.format(report.summary.miniCostsTotal)}</p>
                            </div>
                            <div className="rounded-xl border bg-white p-4 shadow-sm">
                                <p className="text-xs uppercase tracking-wide text-gray-500">Emergenciais</p>
                                <p className="mt-1 text-xl font-semibold text-gray-900">{report.summary.emergencyCount}</p>
                            </div>
                        </div>
                    ) : null}

                    <div className="rounded-xl border bg-white shadow-sm">
                        <div className="border-b px-4 py-3 text-sm font-semibold text-gray-700">Por unidade</div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600">Unidade</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600">Orcamentos</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600">Ticket Medio</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600">Receita Prevista</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600">Receita Recorrente</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600">Horas</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600">Descontos</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600">Simulacao 90d</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {report.byUnit.map((unit) => (
                                        <tr key={unit.unidadeId}>
                                            <td className="px-4 py-2">
                                                <p className="font-medium text-gray-800">{unit.unidadeNome}</p>
                                                <p className="text-xs text-gray-500">{unit.unidadeCodigo}</p>
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
