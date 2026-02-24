import { NextRequest, NextResponse } from 'next/server';
import { E, fail, ok } from '@/lib/api/response';
import { guardCapability } from '@/lib/auth/capability-guard';
import { prisma } from '@/lib/prisma';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';

function parseJson<T = unknown>(value: string | null | undefined): T | null {
    if (!value) return null;
    try {
        return JSON.parse(value) as T;
    } catch {
        return null;
    }
}

function round2(value: number): number {
    return Number(value.toFixed(2));
}

function toCsv(rows: Array<Record<string, unknown>>): string {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const lines = [
        headers.join(','),
        ...rows.map((row) => headers.map((header) => escape(row[header])).join(',')),
    ];
    return lines.join('\n');
}

type ReportRow = {
    orcamentoId: string;
    unidadeId: string;
    unidadeCodigo: string;
    unidadeNome: string;
    contractType: string;
    paymentMethod: string;
    totalHours: number;
    totalRevenue: number;
    totalProviderCost: number;
    grossMargin: number;
    taxTotal: number;
    miniCostsTotal: number;
    discountValue: number;
    emergency: boolean;
    diseaseAddonLabel: string;
};

async function handleGet(request: NextRequest) {
    const guard = await guardCapability('VIEW_ORCAMENTOS');
    if (guard instanceof NextResponse) return guard;

    const url = new URL(request.url);
    const unidadeId = url.searchParams.get('unidade');
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');
    const contractTypeFilter = (url.searchParams.get('contrato_tipo') || '').toUpperCase();
    const paymentMethodFilter = (url.searchParams.get('metodo_pagamento') || '').toUpperCase();
    const format = (url.searchParams.get('format') || 'json').toLowerCase();

    try {
        const orcamentos = await prisma.orcamento.findMany({
            where: {
                ...(unidadeId ? { unidadeId } : {}),
                ...(dateFrom || dateTo
                    ? {
                        createdAt: {
                            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                            ...(dateTo ? { lte: new Date(dateTo) } : {}),
                        },
                    }
                    : {}),
            },
            include: {
                unidade: {
                    select: { id: true, codigo: true, nome: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const rows: ReportRow[] = [];
        const diseaseAddonMap = new Map<string, number>();

        for (const item of orcamentos) {
            const pricing = parseJson<Record<string, unknown>>(item.pricingBreakdown);
            const normalized = parseJson<Record<string, unknown>>(item.normalizedSchedule);
            const snapshotInput = parseJson<Record<string, unknown>>(item.snapshotInput);
            const enterpriseRequest = (snapshotInput?.enterpriseRequest as Record<string, unknown> | undefined) || {};
            const pricingOverrides = (snapshotInput?.pricingOverrides as Record<string, unknown> | undefined) || {};

            const pricingBreakdown = pricing?.breakdown as Record<string, unknown> | undefined;
            const contractType = String(
                snapshotInput?.contractType
                ?? enterpriseRequest.contractType
                ?? 'N/A',
            ).toUpperCase();
            const paymentMethod = String(
                snapshotInput?.paymentMethod
                ?? enterpriseRequest.paymentMethod
                ?? 'N/A',
            ).toUpperCase();

            if (contractTypeFilter && contractTypeFilter !== contractType) continue;
            if (paymentMethodFilter && paymentMethodFilter !== paymentMethod) continue;

            const totalRevenue = Number(
                pricing?.finalPrice
                ?? pricingBreakdown?.final_cliente
                ?? item.valorFinal
                ?? 0,
            );
            const totalProviderCost = Number(
                pricing?.costProfessional
                ?? pricingBreakdown?.custo_profissional
                ?? 0,
            );
            const grossMargin = Number(
                pricing?.grossMargin
                ?? pricingBreakdown?.margem_bruta
                ?? Math.max(0, totalRevenue - totalProviderCost),
            );
            const taxTotal = Number(
                pricing?.taxOverMargin
                ?? pricingBreakdown?.imposto_sobre_comissao
                ?? 0,
            );
            const miniCostsTotal = Number(
                pricing?.minicostsTotal
                ?? pricingBreakdown?.minicustos_total
                ?? 0,
            );
            const discountValue = Number(
                pricing?.discount
                ?? ((pricingBreakdown?.descontos as Record<string, unknown> | undefined)?.total)
                ?? 0,
            );
            const totalHours = Number(normalized?.totalHours ?? 0);
            const emergency = Boolean(
                pricingOverrides.isEmergencyShift
                ?? enterpriseRequest.isEmergencyShift
                ?? false,
            );
            const diseaseAddonLabel = String(
                snapshotInput?.diseaseComplexity
                ?? enterpriseRequest.diseaseComplexity
                ?? 'LOW',
            ).toUpperCase();

            diseaseAddonMap.set(diseaseAddonLabel, (diseaseAddonMap.get(diseaseAddonLabel) || 0) + 1);

            rows.push({
                orcamentoId: item.id,
                unidadeId: item.unidadeId || 'sem-unidade',
                unidadeCodigo: item.unidade?.codigo || 'N/A',
                unidadeNome: item.unidade?.nome || 'Sem unidade',
                contractType,
                paymentMethod,
                totalHours: round2(totalHours),
                totalRevenue: round2(totalRevenue),
                totalProviderCost: round2(totalProviderCost),
                grossMargin: round2(grossMargin),
                taxTotal: round2(taxTotal),
                miniCostsTotal: round2(miniCostsTotal),
                discountValue: round2(discountValue),
                emergency,
                diseaseAddonLabel,
            });
        }

        const byUnitMap = new Map<string, {
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
        }>();

        for (const row of rows) {
            const current = byUnitMap.get(row.unidadeId) || {
                unidadeId: row.unidadeId,
                unidadeCodigo: row.unidadeCodigo,
                unidadeNome: row.unidadeNome,
                totalOrcamentos: 0,
                ticketMedio: 0,
                receitaPrevista: 0,
                receitaRecorrente: 0,
                horasTotaisContratadas: 0,
                impactoDescontos: 0,
                margemMedia: 0,
                simulacaoFutura90d: 0,
            };

            current.totalOrcamentos += 1;
            current.receitaPrevista += row.totalRevenue;
            current.receitaRecorrente += row.totalRevenue;
            current.horasTotaisContratadas += row.totalHours;
            current.impactoDescontos += row.discountValue;
            current.margemMedia += row.totalRevenue > 0 ? (row.grossMargin / row.totalRevenue) * 100 : 0;

            byUnitMap.set(row.unidadeId, current);
        }

        const byUnit = [...byUnitMap.values()].map((entry) => {
            const divisor = Math.max(1, entry.totalOrcamentos);
            const receitaRecorrente = round2(entry.receitaRecorrente);
            return {
                ...entry,
                ticketMedio: round2(entry.receitaPrevista / divisor),
                receitaPrevista: round2(entry.receitaPrevista),
                receitaRecorrente,
                horasTotaisContratadas: round2(entry.horasTotaisContratadas),
                impactoDescontos: round2(entry.impactoDescontos),
                margemMedia: round2(entry.margemMedia / divisor),
                simulacaoFutura90d: round2(receitaRecorrente * 3),
            };
        });

        const summary = {
            totalHours: round2(rows.reduce((acc, row) => acc + row.totalHours, 0)),
            totalRevenue: round2(rows.reduce((acc, row) => acc + row.totalRevenue, 0)),
            totalProviderCost: round2(rows.reduce((acc, row) => acc + row.totalProviderCost, 0)),
            grossMargin: round2(rows.reduce((acc, row) => acc + row.grossMargin, 0)),
            taxTotal: round2(rows.reduce((acc, row) => acc + row.taxTotal, 0)),
            miniCostsTotal: round2(rows.reduce((acc, row) => acc + row.miniCostsTotal, 0)),
            avgDiscount: round2(
                rows.reduce((acc, row) => acc + row.discountValue, 0) / Math.max(1, rows.length),
            ),
            topDiseaseAddons: [...diseaseAddonMap.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([label, count]) => ({ label, count })),
            emergencyCount: rows.filter((row) => row.emergency).length,
        };

        const global = {
            totalOrcamentos: rows.length,
            ticketMedio: round2(summary.totalRevenue / Math.max(1, rows.length)),
            receitaPrevista: summary.totalRevenue,
            receitaRecorrente: summary.totalRevenue,
            horasTotaisContratadas: summary.totalHours,
            impactoDescontos: round2(rows.reduce((acc, row) => acc + row.discountValue, 0)),
            margemMedia: round2(summary.totalRevenue > 0 ? (summary.grossMargin / summary.totalRevenue) * 100 : 0),
        };

        if (format === 'csv') {
            const csv = toCsv(rows.map((row) => ({
                orcamentoId: row.orcamentoId,
                unidadeCodigo: row.unidadeCodigo,
                unidadeNome: row.unidadeNome,
                contractType: row.contractType,
                paymentMethod: row.paymentMethod,
                totalHours: row.totalHours,
                totalRevenue: row.totalRevenue,
                totalProviderCost: row.totalProviderCost,
                grossMargin: row.grossMargin,
                taxTotal: row.taxTotal,
                miniCostsTotal: row.miniCostsTotal,
                discountValue: row.discountValue,
                emergency: row.emergency ? 'yes' : 'no',
                diseaseAddonLabel: row.diseaseAddonLabel,
            })));

            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': 'attachment; filename="relatorio_precificacao.csv"',
                },
            });
        }

        return ok({
            global,
            byUnit,
            summary,
            rows,
        });
    } catch (error) {
        return fail(E.DATABASE_ERROR, 'Erro ao montar relatorio de precificacao', {
            status: 500,
            details: error instanceof Error ? error.message : undefined,
        });
    }
}

export const GET = withErrorBoundary(handleGet);
