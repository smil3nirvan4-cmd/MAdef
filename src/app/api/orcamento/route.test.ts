import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
    calcularOrcamento: vi.fn(),
    calculateEnterprisePricing: vi.fn(),
    generateSchedule: vi.fn(),
    resolveUnitConfig: vi.fn(),
    isEnterprisePricingEnabledForUnit: vi.fn(),
    checkRateLimit: vi.fn(),
    getClientIp: vi.fn(),
    createOrcamento: vi.fn(),
}));

vi.mock('@/lib/pricing/calculator', () => ({
    calcularOrcamento: mocks.calcularOrcamento,
    calculateEnterprisePricing: mocks.calculateEnterprisePricing,
}));

vi.mock('@/lib/scheduling/recurrence-engine', () => ({
    generateSchedule: mocks.generateSchedule,
}));

vi.mock('@/lib/enterprise/config-engine', () => ({
    resolveUnitConfig: mocks.resolveUnitConfig,
}));

vi.mock('@/lib/enterprise/feature-flags', () => ({
    isEnterprisePricingEnabledForUnit: mocks.isEnterprisePricingEnabledForUnit,
}));

vi.mock('@/lib/api/rate-limit', () => ({
    checkRateLimit: mocks.checkRateLimit,
    getClientIp: mocks.getClientIp,
}));

vi.mock('@/lib/prisma', () => ({
    prisma: {
        orcamento: {
            create: mocks.createOrcamento,
        },
    },
}));

import { POST } from './route';

function req(body: unknown): NextRequest {
    return new Request('https://example.com/api/orcamento', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '200.1.2.3' },
        body: JSON.stringify(body),
    }) as unknown as NextRequest;
}

describe('/api/orcamento', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getClientIp.mockReturnValue('200.1.2.3');
        mocks.checkRateLimit.mockReturnValue({ allowed: true, retryAfterMs: 0, remaining: 10 });
        mocks.isEnterprisePricingEnabledForUnit.mockReturnValue(true);
        mocks.generateSchedule.mockReturnValue({
            occurrences: [{ date: '2026-02-18', hours: 12, isHoliday: false }],
            totalHours: 12,
            totalDays: 1,
            totalOccurrences: 1,
            totalDaysActive: 1,
            windowStart: '2026-02-18',
            windowEnd: '2026-02-18',
        });
        mocks.resolveUnitConfig.mockResolvedValue({
            configVersionId: 'cfg-1',
            base12h: {
                CUIDADOR: 180,
                AUXILIAR_ENF: 240,
                TECNICO_ENF: 300,
                ENFERMEIRO: 360,
            },
        });
        mocks.calculateEnterprisePricing.mockResolvedValue({
            finalPrice: 1200,
            costProfessional: 800,
            totalHours: 12,
            totalOccurrences: 1,
            additions: { night: 0, holiday: 0, extraPatient: 0, manual: 0 },
            grossMargin: 250,
            taxOverMargin: 20,
            commissionOperationalCosts: 10,
            paymentFee: 5,
            discount: 0,
            subtotalBeforeFeeAndDiscount: 1195,
            breakdown: {
                custo_profissional: 800,
                margem_bruta: 250,
                imposto_sobre_comissao: 20,
                taxa_pagamento: 5,
                final_cliente: 1200,
                descontos: { total: 0 },
            },
        });
        mocks.calcularOrcamento.mockReturnValue({ total: 999 });
        mocks.createOrcamento.mockResolvedValue({ id: 'orc-1' });
    });

    it('retorna calculo enterprise com metadados', async () => {
        const response = await POST(req({
            planningInput: {
                recurrenceType: 'NONE',
                startDate: '2026-02-18',
                shiftType: 'DIURNO',
                hoursPerOccurrence: 12,
                quantityPatients: 1,
            },
            paymentMethod: 'PIX',
            diseaseComplexity: 'LOW',
            unitCode: 'MATRIZ',
            contractType: 'MENSAL',
        }));
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.success).toBe(true);
        expect(payload.pricingBreakdown.finalPrice).toBe(1200);
        expect(payload.configVersionId).toBe('cfg-1');
        expect(payload.inputHash).toBeTypeOf('string');
    });

    it('mantem modo legado quando nao recebe planningInput', async () => {
        const response = await POST(req({
            tipoProfissional: 'CUIDADOR',
            complexidade: 'BAIXA',
            horasDiarias: 12,
            duracaoDias: 10,
        }));
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.mode).toBe('LEGACY');
        expect(payload.data.total).toBe(999);
    });

    it('bloqueia enterprise quando feature flag da unidade esta desabilitada', async () => {
        mocks.isEnterprisePricingEnabledForUnit.mockReturnValue(false);
        const response = await POST(req({
            planningInput: {
                recurrenceType: 'NONE',
                startDate: '2026-02-18',
                shiftType: 'DIURNO',
                hoursPerOccurrence: 12,
                quantityPatients: 1,
            },
            paymentMethod: 'PIX',
            diseaseComplexity: 'LOW',
            unitCode: 'MATRIZ',
        }));
        const payload = await response.json();

        expect(response.status).toBe(412);
        expect(payload.success).toBe(false);
    });

    it('retorna 429 em rate limit', async () => {
        mocks.checkRateLimit.mockReturnValue({ allowed: false, retryAfterMs: 5000, remaining: 0 });
        const response = await POST(req({
            planningInput: {
                recurrenceType: 'NONE',
                startDate: '2026-02-18',
                shiftType: 'DIURNO',
                hoursPerOccurrence: 12,
                quantityPatients: 1,
            },
            paymentMethod: 'PIX',
            diseaseComplexity: 'LOW',
            unitCode: 'MATRIZ',
        }));

        expect(response.status).toBe(429);
    });

    it('persiste orcamento enterprise quando persist=true e pacienteId informado', async () => {
        const response = await POST(req({
            planningInput: {
                recurrenceType: 'NONE',
                startDate: '2026-02-18',
                shiftType: 'DIURNO',
                hoursPerOccurrence: 12,
                quantityPatients: 1,
            },
            paymentMethod: 'PIX',
            diseaseComplexity: 'LOW',
            unitCode: 'MATRIZ',
            persist: true,
            pacienteId: 'pac-1',
            createdBy: 'user-1',
        }));
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(mocks.createOrcamento).toHaveBeenCalledTimes(1);
        expect(payload.id).toBe('orc-1');
    });

    it('nao persiste orcamento quando persist=true sem pacienteId', async () => {
        const response = await POST(req({
            planningInput: {
                recurrenceType: 'NONE',
                startDate: '2026-02-18',
                shiftType: 'DIURNO',
                hoursPerOccurrence: 12,
                quantityPatients: 1,
            },
            paymentMethod: 'PIX',
            diseaseComplexity: 'LOW',
            unitCode: 'MATRIZ',
            persist: true,
        }));
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(mocks.createOrcamento).not.toHaveBeenCalled();
        expect(payload.id).toBeNull();
    });

    it('usa fallback de compatibilidade quando resolveUnitConfig falha com unitConfigId legado', async () => {
        mocks.resolveUnitConfig
            .mockRejectedValueOnce(new Error('not-found'))
            .mockResolvedValueOnce({
                configVersionId: 'cfg-fallback',
                base12h: {
                    CUIDADOR: 180,
                    AUXILIAR_ENF: 240,
                    TECNICO_ENF: 300,
                    ENFERMEIRO: 360,
                },
            });

        const response = await POST(req({
            planningInput: {
                recurrenceType: 'NONE',
                startDate: '2026-02-18',
                shiftType: 'DIURNO',
                hoursPerOccurrence: 12,
                quantityPatients: 1,
            },
            paymentMethod: 'PIX',
            diseaseComplexity: 'LOW',
            unitConfigId: 'MATRIZ',
        }));
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.configVersionId).toBe('cfg-fallback');
        expect(mocks.resolveUnitConfig).toHaveBeenCalledTimes(2);
    });

    it('retorna 400 para payload enterprise invalido', async () => {
        const response = await POST(req({
            planningInput: {
                recurrenceType: 'NONE',
                startDate: '2026-02-18',
                shiftType: 'DIURNO',
                hoursPerOccurrence: 12,
                quantityPatients: 0,
            },
            paymentMethod: 'PIX',
            diseaseComplexity: 'LOW',
            unitCode: 'MATRIZ',
        }));
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload.success).toBe(false);
        expect(payload.details).toBeDefined();
    });

    it('retorna 400 para payload legado invalido', async () => {
        const response = await POST(req({
            tipoProfissional: 'CUIDADOR',
            complexidade: 'BAIXA',
            horasDiarias: 0,
            duracaoDias: 10,
        }));
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload.success).toBe(false);
    });

    it('retorna 500 quando pricing engine enterprise falha', async () => {
        mocks.calculateEnterprisePricing.mockRejectedValueOnce(new Error('pricing failed'));

        const response = await POST(req({
            planningInput: {
                recurrenceType: 'NONE',
                startDate: '2026-02-18',
                shiftType: 'DIURNO',
                hoursPerOccurrence: 12,
                quantityPatients: 1,
            },
            paymentMethod: 'PIX',
            diseaseComplexity: 'LOW',
            unitCode: 'MATRIZ',
        }));
        const payload = await response.json();

        expect(response.status).toBe(500);
        expect(payload.success).toBe(false);
        expect(payload.error).toContain('pricing failed');
    });

    it('aplica fallback legado quando schema enterprise esta incompleto no banco', async () => {
        mocks.resolveUnitConfig.mockRejectedValueOnce(
            new Error('The column `main.UnidadeConfiguracaoVersao.effectiveFrom` does not exist in the current database.'),
        );
        mocks.resolveUnitConfig.mockRejectedValueOnce(
            new Error('The column `main.UnidadeConfiguracaoVersao.effectiveFrom` does not exist in the current database.'),
        );
        mocks.calcularOrcamento.mockReturnValueOnce({
            total: 1200,
            parcelamento: {
                entrada: 360,
                quantidadeParcelas: 1,
                valorParcela: 840,
            },
            detalhamento: [],
        });

        const response = await POST(req({
            planningInput: {
                recurrenceType: 'NONE',
                startDate: '2026-02-18',
                shiftType: 'DIURNO',
                hoursPerOccurrence: 12,
                quantityPatients: 1,
            },
            paymentMethod: 'PIX',
            diseaseComplexity: 'LOW',
            unitCode: 'MATRIZ',
            manualDiscount: 10,
        }));
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.success).toBe(true);
        expect(payload.mode).toBe('LEGACY_FALLBACK');
        expect(payload.warning).toContain('Schema enterprise incompleto');
        expect(payload.data.total).toBeGreaterThan(0);
        expect(mocks.calcularOrcamento).toHaveBeenCalledTimes(1);
    });

    it('envia overrides e descontos para calculator enterprise', async () => {
        const response = await POST(req({
            planningInput: {
                recurrenceType: 'NONE',
                startDate: '2026-02-18',
                shiftType: 'DIURNO',
                hoursPerOccurrence: 12,
                quantityPatients: 2,
                additionalPercent: 12,
            },
            paymentMethod: 'PIX',
            paymentPeriod: 'SEMANAL',
            diseaseComplexity: 'HIGH',
            unitCode: 'MATRIZ',
            pricingOverrides: {
                baseProfessionalValue: 999,
                additionalPercent: 18,
                emergencySurchargePercent: 25,
                isEmergencyShift: true,
            },
            discounts: {
                manualPercent: 10,
                fixed: 55,
            },
            miniCostsDisabled: ['marketing'],
        }));

        expect(response.status).toBe(200);
        expect(mocks.calculateEnterprisePricing).toHaveBeenCalledWith(
            expect.objectContaining({
                baseProfessionalValue: 999,
                manualDiscount: 10,
                discountFixed: 55,
                disableMinicosts: ['marketing'],
                paymentPeriod: 'SEMANAL',
                quantityPatients: 2,
                additionalPercent: 18,
                isEmergencyShift: true,
                emergencySurchargePercent: 25,
            }),
        );
    });
});
