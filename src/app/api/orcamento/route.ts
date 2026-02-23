import { NextRequest, NextResponse } from 'next/server';
import {
    calcularOrcamento,
    calculateEnterprisePricing,
    type EnterprisePricingParams,
    type OrcamentoInput,
} from '@/lib/pricing/calculator';
import {
    generateSchedule,
    type PlanningInput,
} from '@/lib/scheduling/recurrence-engine';
import { z, ZodError } from 'zod';
import { computeInputHash } from '@/lib/pricing/input-hash';
import { resolveUnitConfig } from '@/lib/enterprise/config-engine';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';
import { isEnterprisePricingEnabledForUnit } from '@/lib/enterprise/feature-flags';
import { prisma } from '@/lib/prisma';
import { parseBody } from '@/lib/api/parse-body';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';

const ENGINE_VERSION = 'enterprise-pricing-v3';

const LegacyOrcamentoSchema = z.object({
    tipoProfissional: z.enum(['CUIDADOR', 'AUXILIAR_ENF', 'TECNICO_ENF']),
    complexidade: z.enum(['BAIXA', 'MEDIA', 'ALTA']),
    horasDiarias: z.number().min(1).max(24),
    duracaoDias: z.number().min(1).max(365),
    diasAtivos: z.number().min(1).max(365).optional(),
    incluirNoturno: z.boolean().optional(),
    feriados: z.number().min(0).optional(),
    quantidadePacientes: z.number().min(1).max(10).optional(),
    adicionalPercentual: z.number().min(0).max(300).optional(),
});

const PlanningInputSchema = z.object({
    recurrenceType: z.enum(['NONE', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM_DATES', 'PACKAGE']),
    startDate: z.string().min(10),
    endDate: z.string().optional(),
    durationDays: z.number().int().positive().optional(),
    occurrences: z.number().int().positive().optional(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
    interval: z.number().int().positive().optional(),
    shiftType: z.enum(['DIURNO', 'NOTURNO', '24H', 'CUSTOM']),
    shiftStart: z.string().optional(),
    shiftEnd: z.string().optional(),
    hoursPerOccurrence: z.number().positive(),
    holidays: z.array(z.union([
        z.string(),
        z.object({
            date: z.string(),
            type: z.enum(['NATIONAL', 'CUSTOM', 'YEAR_END']).optional(),
            name: z.string().optional(),
            recurringAnnual: z.boolean().optional(),
        }),
    ])).optional(),
    excludedDates: z.array(z.string()).optional(),
    includedDates: z.array(z.string()).optional(),
    customDates: z.array(z.string()).optional(),
    quantityPatients: z.number().int().positive(),
    additionalPercent: z.number().min(0).optional(),
    debug: z.boolean().optional(),
});

const EnterpriseSchema = z.object({
    unitId: z.string().optional(),
    unitCode: z.string().optional(),
    unitConfigId: z.string().optional(),
    contractType: z.enum(['AVULSO', 'SEMANAL', 'MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL']).default('MENSAL'),
    paymentMethod: z.enum(['PIX', 'CARTAO', 'BOLETO', 'CARTAO_CREDITO', 'LINK_PAGAMENTO']).default('PIX'),
    paymentPeriod: z.enum(['DIARIO', 'SEMANAL', 'QUINZENAL', 'MENSAL']).optional(),
    planningInput: PlanningInputSchema,
    roleSelected: z.enum(['CUIDADOR', 'AUXILIAR_ENF', 'TECNICO_ENF', 'ENFERMEIRO']).optional(),
    diseaseComplexity: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('LOW'),
    pricingOverrides: z.object({
        baseProfessionalValue: z.number().positive().optional(),
        additionalPercent: z.number().min(0).optional(),
        emergencySurchargePercent: z.number().min(0).optional(),
        isEmergencyShift: z.boolean().optional(),
    }).optional(),
    discounts: z.object({
        manualPercent: z.number().min(0).max(100).optional(),
        fixed: z.number().min(0).optional(),
    }).optional(),
    miniCostsDisabled: z.array(z.string()).optional(),

    // Compat com payload enterprise anterior
    baseProfessionalValue: z.number().positive().optional(),
    manualDiscount: z.number().min(0).max(100).optional(),
    disableMinicosts: z.array(z.string()).optional(),
    additionalPercent: z.number().min(0).optional(),

    // Persistencia opcional
    persist: z.boolean().optional(),
    pacienteId: z.string().optional(),
    avaliacaoId: z.string().optional(),
    createdBy: z.string().optional(),
});

function mapComplexidadeToLegacy(value: 'LOW' | 'MEDIUM' | 'HIGH'): 'BAIXA' | 'MEDIA' | 'ALTA' {
    if (value === 'HIGH') return 'ALTA';
    if (value === 'MEDIUM') return 'MEDIA';
    return 'BAIXA';
}

function mapRoleToLegacy(value?: 'CUIDADOR' | 'AUXILIAR_ENF' | 'TECNICO_ENF' | 'ENFERMEIRO'): 'CUIDADOR' | 'AUXILIAR_ENF' | 'TECNICO_ENF' {
    if (value === 'TECNICO_ENF' || value === 'ENFERMEIRO') return 'TECNICO_ENF';
    if (value === 'AUXILIAR_ENF') return 'AUXILIAR_ENF';
    return 'CUIDADOR';
}

function isEnterpriseSchemaMismatch(error: unknown): boolean {
    const message = String((error as Error | undefined)?.message || '').toLowerCase();
    if (!message) return false;
    return (
        message.includes('does not exist in the current database')
        || message.includes('the column')
        || message.includes('p2022')
        || message.includes('effectivefrom')
    );
}

function buildLegacyInputFromEnterprise(args: {
    enterpriseInput: z.infer<typeof EnterpriseSchema>;
    planningInput: PlanningInput;
    normalizedSchedule: ReturnType<typeof generateSchedule>;
}): OrcamentoInput {
    const { enterpriseInput, planningInput, normalizedSchedule } = args;
    const manualAdditionalPercent = enterpriseInput.pricingOverrides?.additionalPercent
        ?? enterpriseInput.additionalPercent
        ?? planningInput.additionalPercent
        ?? 0;

    const holidayOccurrences = normalizedSchedule.occurrences
        .filter((item) => item.isHoliday)
        .length;

    return {
        tipoProfissional: mapRoleToLegacy(enterpriseInput.roleSelected),
        complexidade: mapComplexidadeToLegacy(enterpriseInput.diseaseComplexity),
        horasDiarias: Math.max(1, Math.min(24, Math.round(planningInput.hoursPerOccurrence || 12))),
        duracaoDias: Math.max(1, Number(normalizedSchedule.totalDays || planningInput.durationDays || planningInput.occurrences || 1)),
        diasAtivos: Math.max(1, Number(normalizedSchedule.totalOccurrences || planningInput.occurrences || 1)),
        incluirNoturno: planningInput.shiftType === 'NOTURNO',
        feriados: Math.max(0, holidayOccurrences),
        quantidadePacientes: Math.max(1, Number(planningInput.quantityPatients || 1)),
        adicionalPercentual: Math.max(0, Number(manualAdditionalPercent || 0)),
    };
}

function applyEnterpriseFallbackDiscounts(
    legacy: ReturnType<typeof calcularOrcamento>,
    enterpriseInput: z.infer<typeof EnterpriseSchema>,
) {
    const percent = Math.max(0, Number(enterpriseInput.discounts?.manualPercent ?? enterpriseInput.manualDiscount ?? 0));
    const fixed = Math.max(0, Number(enterpriseInput.discounts?.fixed ?? 0));
    const discountValue = Number((legacy.total * (percent / 100) + fixed).toFixed(2));
    const total = Math.max(0, Number((legacy.total - discountValue).toFixed(2)));

    const parcelCount = Math.max(1, Number(legacy.parcelamento?.quantidadeParcelas || 1));
    const entrada = Number((total * 0.3).toFixed(2));
    const valorParcela = Number((((total - entrada) / parcelCount) || 0).toFixed(2));

    return {
        ...legacy,
        total,
        parcelamento: {
            entrada,
            quantidadeParcelas: parcelCount,
            valorParcela,
        },
        detalhamento: [
            ...legacy.detalhamento,
            ...(discountValue > 0
                ? [{ descricao: 'Desconto aplicado (fallback legado)', valor: -discountValue }]
                : []),
        ],
    };
}

function baseValueByRole(role: 'CUIDADOR' | 'AUXILIAR_ENF' | 'TECNICO_ENF' | 'ENFERMEIRO', config: Awaited<ReturnType<typeof resolveUnitConfig>>) {
    return config.base12h[role];
}

function buildLegacyProjection(
    planningInput: PlanningInput,
    pricing: Awaited<ReturnType<typeof calculateEnterprisePricing>>,
) {
    return {
        valorHora: Number((pricing.costProfessional / Math.max(1, pricing.totalHours)).toFixed(2)),
        horasTotais: pricing.totalHours,
        diasAtivos: pricing.totalOccurrences,
        quantidadePacientes: planningInput.quantityPatients,
        subtotal: pricing.subtotalBeforeFeeAndDiscount,
        adicionalComplexidade: pricing.additions.manual,
        adicionalPacientes: pricing.additions.extraPatient,
        adicionalVariaveis: pricing.additions.manual,
        adicionalNoturno: pricing.additions.night,
        adicionalFeriado: pricing.additions.holiday,
        taxaAdministrativa: pricing.paymentFee,
        total: pricing.finalPrice,
        demandaEquipe: pricing.totalOccurrences > 4,
        quantidadeCuidadores: planningInput.shiftType === '24H' ? 8 : planningInput.shiftType === 'NOTURNO' ? 4 : 2,
        parcelamento: {
            entrada: Number((pricing.finalPrice * 0.3).toFixed(2)),
            quantidadeParcelas: Math.max(1, Math.min(12, Math.round(pricing.totalOccurrences / 5))),
            valorParcela: Number(((pricing.finalPrice * 0.7) / Math.max(1, Math.min(12, Math.round(pricing.totalOccurrences / 5)))).toFixed(2)),
        },
        detalhamento: [
            { descricao: 'Custo profissional', valor: pricing.costProfessional },
            { descricao: 'Adicional noturno', valor: pricing.additions.night },
            { descricao: 'Adicional feriado', valor: pricing.additions.holiday },
            { descricao: 'Adicional paciente extra', valor: pricing.additions.extraPatient },
            { descricao: 'Adicional manual/complexidade', valor: pricing.additions.manual },
            { descricao: 'Margem bruta', valor: pricing.grossMargin },
            { descricao: 'Imposto sobre margem', valor: pricing.taxOverMargin },
            { descricao: 'Custos operacionais sobre comissao', valor: pricing.commissionOperationalCosts },
            { descricao: 'Taxa de pagamento', valor: pricing.paymentFee },
            { descricao: 'Desconto', valor: -pricing.discount },
        ],
    };
}

async function tryPersistEnterpriseOrcamento(args: {
    enterpriseInput: z.infer<typeof EnterpriseSchema>;
    planningInput: PlanningInput;
    normalizedSchedule: ReturnType<typeof generateSchedule>;
    pricingBreakdown: Awaited<ReturnType<typeof calculateEnterprisePricing>>;
    inputHash: string;
    configVersionId: string;
}) {
    const { enterpriseInput } = args;
    if (!enterpriseInput.persist || !enterpriseInput.pacienteId) return null;

    const created = await prisma.orcamento.create({
        data: {
            pacienteId: enterpriseInput.pacienteId,
            avaliacaoId: enterpriseInput.avaliacaoId ?? null,
            unidadeId: enterpriseInput.unitId ?? null,
            configVersionId: args.configVersionId,
            snapshotInput: JSON.stringify(enterpriseInput),
            planningInput: JSON.stringify(args.planningInput),
            normalizedSchedule: JSON.stringify(args.normalizedSchedule),
            pricingBreakdown: JSON.stringify(args.pricingBreakdown),
            valorFinal: args.pricingBreakdown.finalPrice,
            status: 'RASCUNHO',
            engineVersion: ENGINE_VERSION,
            calculationHash: args.inputHash,
            auditHash: args.inputHash,
            createdBy: enterpriseInput.createdBy ?? null,
            descontoManualPercent: enterpriseInput.discounts?.manualPercent ?? enterpriseInput.manualDiscount ?? null,
            minicustosDesativados: JSON.stringify(
                enterpriseInput.miniCostsDisabled
                ?? enterpriseInput.disableMinicosts
                ?? [],
            ),
        },
        select: {
            id: true,
        },
    });

    return created.id;
}

async function handlePost(request: NextRequest) {
    const guard = await guardCapability('MANAGE_ORCAMENTOS');
    if (guard instanceof NextResponse) return guard;

    try {
        const ip = getClientIp(request);
        const rateLimit = checkRateLimit(`orcamento:${ip}`, 40, 60_000);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Rate limit exceeded',
                    retryAfterMs: rateLimit.retryAfterMs,
                },
                { status: 429 },
            );
        }

        const jsonResult = await parseBody(request, z.record(z.string(), z.unknown()));
        if (jsonResult.error) return jsonResult.error;
        const body = jsonResult.data;

        if (body?.planningInput) {
            const parsedEnterprise = EnterpriseSchema.parse(body);

            const unitKey = parsedEnterprise.unitId ?? parsedEnterprise.unitCode ?? parsedEnterprise.unitConfigId;
            if (!isEnterprisePricingEnabledForUnit(unitKey)) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Enterprise pricing desabilitado para a unidade',
                    },
                    { status: 412 },
                );
            }

            const planningInput = parsedEnterprise.planningInput as PlanningInput;
            const normalizedSchedule = generateSchedule(planningInput);
            try {
                let configSnapshot;
                try {
                    configSnapshot = await resolveUnitConfig({
                        unidadeId: parsedEnterprise.unitId,
                        unidadeCodigo: parsedEnterprise.unitCode,
                        configVersionId: parsedEnterprise.unitConfigId,
                    });
                } catch {
                    // Compatibilidade: payload antigo frequentemente envia "MATRIZ" em unitConfigId.
                    configSnapshot = await resolveUnitConfig({
                        unidadeId: parsedEnterprise.unitId,
                        unidadeCodigo: parsedEnterprise.unitCode ?? parsedEnterprise.unitConfigId,
                    });
                }

                const resolvedRole = parsedEnterprise.roleSelected ?? 'CUIDADOR';
                const baseProfessionalValue = parsedEnterprise.pricingOverrides?.baseProfessionalValue
                    ?? parsedEnterprise.baseProfessionalValue
                    ?? baseValueByRole(resolvedRole, configSnapshot);

                const enterpriseParams: EnterprisePricingParams = {
                    schedule: normalizedSchedule,
                    baseProfessionalValue,
                    paymentMethod: parsedEnterprise.paymentMethod,
                    diseaseComplexity: parsedEnterprise.diseaseComplexity,
                    unitConfigId: configSnapshot.configVersionId,
                    manualDiscount: parsedEnterprise.discounts?.manualPercent ?? parsedEnterprise.manualDiscount,
                    discountFixed: parsedEnterprise.discounts?.fixed,
                    disableMinicosts: parsedEnterprise.miniCostsDisabled ?? parsedEnterprise.disableMinicosts,
                    paymentPeriod: parsedEnterprise.paymentPeriod,
                    quantityPatients: planningInput.quantityPatients,
                    additionalPercent: parsedEnterprise.pricingOverrides?.additionalPercent
                        ?? parsedEnterprise.additionalPercent
                        ?? planningInput.additionalPercent,
                    shiftType: planningInput.shiftType,
                    isEmergencyShift: parsedEnterprise.pricingOverrides?.isEmergencyShift,
                    emergencySurchargePercent: parsedEnterprise.pricingOverrides?.emergencySurchargePercent,
                };

                const pricingBreakdown = await calculateEnterprisePricing(enterpriseParams);
                const inputHash = computeInputHash({
                    planningInput,
                    enterpriseParams: {
                        ...enterpriseParams,
                        schedule: undefined,
                    },
                    normalizedSchedule,
                    configVersionId: configSnapshot.configVersionId,
                    engineVersion: ENGINE_VERSION,
                });

                const persistedId = await tryPersistEnterpriseOrcamento({
                    enterpriseInput: parsedEnterprise,
                    planningInput,
                    normalizedSchedule,
                    pricingBreakdown,
                    inputHash,
                    configVersionId: configSnapshot.configVersionId,
                });

                const legacyProjection = buildLegacyProjection(planningInput, pricingBreakdown);

                return NextResponse.json({
                    success: true,
                    id: persistedId ?? null,
                    data: legacyProjection,
                    planningInput,
                    normalizedSchedule,
                    enterpriseRequest: enterpriseParams,
                    pricingBreakdown,
                    engineVersion: ENGINE_VERSION,
                    configVersionId: configSnapshot.configVersionId,
                    inputHash,
                    complexity: mapComplexidadeToLegacy(parsedEnterprise.diseaseComplexity),
                    contractType: parsedEnterprise.contractType,
                });
            } catch (enterpriseError) {
                if (!isEnterpriseSchemaMismatch(enterpriseError)) {
                    throw enterpriseError;
                }

                const fallbackInput = buildLegacyInputFromEnterprise({
                    enterpriseInput: parsedEnterprise,
                    planningInput,
                    normalizedSchedule,
                });
                const fallback = applyEnterpriseFallbackDiscounts(
                    calcularOrcamento(fallbackInput),
                    parsedEnterprise,
                );

                return NextResponse.json({
                    success: true,
                    mode: 'LEGACY_FALLBACK',
                    warning: 'Schema enterprise incompleto no banco atual. Aplicado fallback legado para evitar falha de operacao.',
                    data: fallback,
                    planningInput,
                    normalizedSchedule,
                    complexity: mapComplexidadeToLegacy(parsedEnterprise.diseaseComplexity),
                    contractType: parsedEnterprise.contractType,
                    engineVersion: ENGINE_VERSION,
                });
            }
        }

        const input = LegacyOrcamentoSchema.parse(body) as OrcamentoInput;
        const orcamento = calcularOrcamento(input);
        return NextResponse.json({
            success: true,
            data: orcamento,
            mode: 'LEGACY',
        });
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json(
                { success: false, error: 'Dados invalidos', details: error.issues },
                { status: 400 },
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Erro ao calcular orcamento',
            },
            { status: 500 },
        );
    }
}

export const POST = withErrorBoundary(handlePost);
