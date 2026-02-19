import { NextRequest, NextResponse } from 'next/server';
import { E, fail, ok } from '@/lib/api/response';
import { guardCapability } from '@/lib/auth/capability-guard';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/observability/logger';
import { calculateEnterprisePricing } from '@/lib/pricing/calculator';
import { computeInputHash } from '@/lib/pricing/input-hash';
import { calculateEnterprisePrice } from '@/lib/pricing/enterprise-engine';
import { getPricingConfigSnapshot } from '@/lib/pricing/config-service';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';

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

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const guard = await guardCapability('MANAGE_ORCAMENTOS');
    if (guard instanceof NextResponse) return guard;

    const rate = checkRateLimit(`recalculate:${getClientIp(request)}`, 20, 60_000);
    if (!rate.allowed) {
        return fail(E.CONFLICT, 'Rate limit exceeded para recalculate', {
            status: 429,
            details: { retryAfterMs: rate.retryAfterMs },
        });
    }

    const { id } = await params;
    const orcamento = await prisma.orcamento.findUnique({
        where: { id },
    });

    if (!orcamento) {
        return fail(E.NOT_FOUND, 'Orcamento nao encontrado', { status: 404 });
    }

    const snapshotInput = parseJson<Record<string, unknown>>(orcamento.snapshotInput);
    const planningInput = parseJson<Record<string, unknown>>(orcamento.planningInput);
    const normalizedSchedule = parseJson<Record<string, unknown>>(orcamento.normalizedSchedule);
    const storedBreakdown = parseJson<Record<string, unknown>>(orcamento.pricingBreakdown);
    const storedHash = orcamento.calculationHash || null;
    const storedFinal = round2(
        Number(
            orcamento.valorFinal
            ?? storedBreakdown?.finalPrice
            ?? storedBreakdown?.totalFinal
            ?? 0,
        ),
    );

    let recalculatedFinal = 0;
    let mode: 'ENTERPRISE_SCHEDULE' | 'ENTERPRISE_SCENARIO';
    let payload: Record<string, unknown>;
    let recalculatedBreakdown: Record<string, unknown> | null = null;

    if (
        snapshotInput?.enterpriseRequest
        && normalizedSchedule
    ) {
        const enterpriseRequest = snapshotInput.enterpriseRequest as Parameters<typeof calculateEnterprisePricing>[0];
        const result = await calculateEnterprisePricing(enterpriseRequest);
        recalculatedFinal = round2(result.finalPrice);
        mode = 'ENTERPRISE_SCHEDULE';
        payload = { enterpriseRequest, normalizedSchedule, result };
        recalculatedBreakdown = result.breakdown as unknown as Record<string, unknown>;
    } else if (snapshotInput && orcamento.configVersionId) {
        const config = await getPricingConfigSnapshot({
            configVersionId: orcamento.configVersionId,
        });
        const result = calculateEnterprisePrice(
            config,
            snapshotInput as unknown as Parameters<typeof calculateEnterprisePrice>[1],
        );
        recalculatedFinal = round2(result.totalFinal);
        mode = 'ENTERPRISE_SCENARIO';
        payload = { scenarioInput: snapshotInput, result };
        recalculatedBreakdown = {
            totalFinal: result.totalFinal,
            subtotal: result.subtotalSemTaxaSemDesconto,
            taxaPagamento: result.taxaPagamentoValor,
            desconto: result.descontoValor,
            imposto: result.impostoSobreComissaoValor,
            margem: result.comissaoBruta,
        };
    } else {
        return fail(E.VALIDATION_ERROR, 'Nao ha snapshot suficiente para recalculo', {
            status: 422,
            details: {
                hasSnapshotInput: Boolean(snapshotInput),
                hasPlanningInput: Boolean(planningInput),
                hasNormalizedSchedule: Boolean(normalizedSchedule),
            },
        });
    }

    const difference = round2(recalculatedFinal - storedFinal);
    const hasDivergence = difference !== 0;
    const recommendation: 'OK' | 'WARNING' | 'BREAKING' = hasDivergence
        ? Math.abs(difference) >= 1 ? 'BREAKING' : 'WARNING'
        : 'OK';
    const recalculatedHash = computeInputHash({
        mode,
        payload,
        configVersionId: orcamento.configVersionId,
        engineVersion: orcamento.engineVersion ?? 'enterprise-pricing-v3',
    });

    const diffSnapshot = {
        total: {
            before: storedFinal,
            after: recalculatedFinal,
            difference,
        },
        hash: {
            before: storedHash,
            after: recalculatedHash,
            changed: storedHash !== recalculatedHash,
        },
        breakdown: {
            before: storedBreakdown,
            after: recalculatedBreakdown,
        },
    };

    await prisma.orcamento.update({
        where: { id: orcamento.id },
        data: {
            calculationHash: recalculatedHash,
            engineVersion: orcamento.engineVersion ?? 'enterprise-pricing-v2',
        },
    });

    const auditLogModel = (prisma as unknown as {
        orcamentoAuditLog?: {
            create: (args: {
                data: {
                    orcamentoId: string;
                    configVersionId: string | null;
                    acao: string;
                    status: string;
                    beforeSnapshot: string;
                    afterSnapshot: string;
                    diffSnapshot: string;
                    inputHash: string;
                    requestId: string | null;
                    createdBy: string | null;
                };
            }) => Promise<unknown>;
        };
    }).orcamentoAuditLog;

    if (auditLogModel?.create) {
        await auditLogModel.create({
            data: {
                orcamentoId: orcamento.id,
                configVersionId: orcamento.configVersionId ?? null,
                acao: 'RECALCULATE',
                status: hasDivergence ? 'WARNING' : 'OK',
                beforeSnapshot: JSON.stringify({
                    storedFinal,
                    storedHash,
                    pricingBreakdown: storedBreakdown,
                }),
                afterSnapshot: JSON.stringify({
                    recalculatedFinal,
                    recalculatedHash,
                    mode,
                    recommendation,
                }),
                diffSnapshot: JSON.stringify(diffSnapshot),
                inputHash: recalculatedHash,
                requestId: null,
                createdBy: null,
            },
        });
    }

    if (hasDivergence) {
        await logger.warning('orcamento_recalculate_divergence', 'Divergencia detectada no recalculo do orcamento', {
            orcamentoId: orcamento.id,
            storedFinal,
            recalculatedFinal,
            difference,
            mode,
            storedHash,
            recalculatedHash,
            recommendation,
        });
    } else {
        await logger.info('orcamento_recalculate_ok', 'Recalculo do orcamento sem divergencia', {
            orcamentoId: orcamento.id,
            storedFinal,
            recalculatedFinal,
            mode,
            storedHash,
            recalculatedHash,
            recommendation,
        });
    }

    return ok({
        orcamentoId: orcamento.id,
        mode,
        storedFinal,
        recalculatedFinal,
        difference,
        hasDivergence,
        recommendation,
        storedHash,
        recalculatedHash,
        diff: diffSnapshot,
    });
}
