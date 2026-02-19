import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    ensureDefaultPricingConfig: vi.fn(),
    getPricingConfigSnapshot: vi.fn(),
    queryRange: vi.fn(),
    findVersion: vi.fn(),
    findVersionById: vi.fn(),
    findUnitByCode: vi.fn(),
    warning: vi.fn(),
}));

vi.mock('@/lib/pricing/config-service', () => ({
    ensureDefaultPricingConfig: mocks.ensureDefaultPricingConfig,
    getPricingConfigSnapshot: mocks.getPricingConfigSnapshot,
}));

vi.mock('@/lib/prisma', () => ({
    prisma: {
        $queryRaw: mocks.queryRange,
        unidadeConfiguracaoVersao: {
            findFirst: mocks.findVersion,
            findUnique: mocks.findVersionById,
        },
        unidade: {
            findUnique: mocks.findUnitByCode,
        },
    },
}));

vi.mock('@/lib/observability/logger', () => ({
    default: {
        warning: mocks.warning,
    },
}));

import { getActiveConfig, invalidateConfigCache, resolveUnitConfig } from './config-engine';

describe('config-engine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        invalidateConfigCache();

        mocks.ensureDefaultPricingConfig.mockResolvedValue({
            unidadeId: 'u-default',
            configVersionId: 'cfg-default',
        });

        mocks.getPricingConfigSnapshot.mockImplementation(async (args: { configVersionId?: string }) => ({
            unidadeId: 'u-test',
            unidadeCodigo: 'MATRIZ',
            unidadeNome: 'Matriz',
            currency: 'BRL',
            configVersionId: args.configVersionId ?? 'cfg-missing',
            configVersion: 1,
            aplicarTaxaAntesDesconto: false,
            base12h: {
                CUIDADOR: 180,
                AUXILIAR_ENF: 240,
                TECNICO_ENF: 300,
                ENFERMEIRO: 360,
            },
            adicionaisPercent: {
                segundoPaciente: 50,
                noturno: 20,
                fimSemana: 20,
                feriado: 20,
                altoRisco: 15,
                at: 0,
                aa: 0,
            },
            adicionaisEscalaHoras: { at: true, aa: true },
            margemPercent: 32,
            lucroFixo: 0,
            lucroFixoEscalaHoras: false,
            impostoSobreComissaoPercent: 6,
            hourRules: Array.from({ length: 12 }).map((_, idx) => ({
                hora: idx + 1,
                fatorPercent: Number(((idx + 1) / 12).toFixed(2)),
            })),
            paymentFeeRules: [],
            miniCostRules: [],
            commissionPercentRules: [],
            diseaseRules: [],
            discountPresets: [],
        }));

        mocks.findVersionById.mockImplementation(async (args: { where: { id: string } }) => ({
            id: args.where.id,
            version: 1,
        }));
    });

    it('resolve versao ativa dentro da vigencia effectiveFrom/effectiveTo', async () => {
        mocks.queryRange.mockResolvedValueOnce([{ id: 'cfg-in-range' }]);

        const result = await getActiveConfig('u-1', '2026-02-18T12:00:00Z');

        expect(mocks.queryRange).toHaveBeenCalledTimes(1);
        expect(mocks.findVersionById).toHaveBeenCalledWith({
            where: { id: 'cfg-in-range' },
        });
        expect(result.configVersionId).toBe('cfg-in-range');
        expect(mocks.warning).not.toHaveBeenCalled();
    });

    it('faz fallback para versao ativa mais recente da mesma unidade quando nao ha vigencia', async () => {
        mocks.queryRange.mockResolvedValueOnce([]);
        mocks.findVersion
            .mockResolvedValueOnce({
                id: 'cfg-latest',
                version: 8,
            });

        const result = await getActiveConfig('u-2', '2026-01-01T00:00:00Z');

        expect(mocks.findVersion).toHaveBeenCalledTimes(1);
        expect(mocks.findVersion.mock.calls[0]?.[0]).toMatchObject({
            where: { unidadeId: 'u-2', isActive: true },
        });
        expect(result.configVersionId).toBe('cfg-latest');
        expect(mocks.warning).not.toHaveBeenCalled();
    });

    it('faz fallback para configuracao default da matriz quando unidade nao possui versao ativa', async () => {
        mocks.queryRange
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([]);
        mocks.findVersion
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({
                id: 'cfg-default',
                version: 1,
            });
        mocks.findUnitByCode.mockResolvedValueOnce({
            id: 'u-default',
            codigo: 'MATRIZ',
        });

        const result = await getActiveConfig('u-sem-config', '2026-02-18T00:00:00Z');

        expect(mocks.findUnitByCode).toHaveBeenCalledWith({
            where: { codigo: 'MATRIZ' },
        });
        expect(result.configVersionId).toBe('cfg-default');
        expect(mocks.warning).toHaveBeenCalledTimes(1);
    });

    it('resolve direto por configVersionId quando informado', async () => {
        const result = await resolveUnitConfig({
            configVersionId: 'cfg-explicita',
        });

        expect(mocks.getPricingConfigSnapshot).toHaveBeenCalledWith({
            configVersionId: 'cfg-explicita',
        });
        expect(result.configVersionId).toBe('cfg-explicita');
    });

    it('usa cache para mesma unidade/data', async () => {
        mocks.queryRange.mockResolvedValueOnce([{ id: 'cfg-cache' }]);

        await getActiveConfig('u-cache', '2026-02-18T00:00:00Z');
        await getActiveConfig('u-cache', '2026-02-18T12:00:00Z');

        expect(mocks.getPricingConfigSnapshot).toHaveBeenCalledTimes(1);
    });

    it('resolve por unidadeCodigo quando informado', async () => {
        mocks.findUnitByCode.mockResolvedValueOnce({
            id: 'u-code',
            codigo: 'RIO',
        });
        mocks.queryRange.mockResolvedValueOnce([{ id: 'cfg-code' }]);

        const result = await resolveUnitConfig({
            unidadeCodigo: 'RIO',
            atDate: '2026-02-18T00:00:00Z',
        });

        expect(mocks.findUnitByCode).toHaveBeenCalledWith({
            where: { codigo: 'RIO' },
        });
        expect(result.configVersionId).toBe('cfg-code');
    });

    it('resolve por fallback default quando unidadeCodigo nao existe', async () => {
        mocks.findUnitByCode.mockResolvedValueOnce(null);
        mocks.queryRange.mockResolvedValueOnce([]);
        mocks.findVersion.mockResolvedValueOnce({
            id: 'cfg-default',
            version: 1,
        });
        mocks.findUnitByCode.mockResolvedValueOnce({
            id: 'u-default',
            codigo: 'MATRIZ',
        });

        const result = await resolveUnitConfig({
            unidadeCodigo: 'INEXISTENTE',
        });

        expect(result.configVersionId).toBe('cfg-default');
    });

    it('invalida cache por configVersionId', async () => {
        mocks.queryRange.mockResolvedValueOnce([{ id: 'cfg-cache-id' }]);

        await getActiveConfig('u-cache-id', '2026-02-18T00:00:00Z');
        await getActiveConfig('u-cache-id', '2026-02-18T00:00:00Z');
        expect(mocks.getPricingConfigSnapshot).toHaveBeenCalledTimes(1);

        invalidateConfigCache('cfg-cache-id');
        mocks.queryRange.mockResolvedValueOnce([{ id: 'cfg-cache-id' }]);

        await getActiveConfig('u-cache-id', '2026-02-18T00:00:00Z');
        expect(mocks.getPricingConfigSnapshot).toHaveBeenCalledTimes(2);
    });

    it('invalida todo o cache quando chamado sem configVersionId', async () => {
        mocks.queryRange
            .mockResolvedValueOnce([{ id: 'cfg-a' }])
            .mockResolvedValueOnce([{ id: 'cfg-b' }]);

        await getActiveConfig('u-a', '2026-02-18T00:00:00Z');
        await getActiveConfig('u-b', '2026-02-18T00:00:00Z');
        expect(mocks.getPricingConfigSnapshot).toHaveBeenCalledTimes(2);

        invalidateConfigCache();
        mocks.queryRange
            .mockResolvedValueOnce([{ id: 'cfg-a' }])
            .mockResolvedValueOnce([{ id: 'cfg-b' }]);

        await getActiveConfig('u-a', '2026-02-18T00:00:00Z');
        await getActiveConfig('u-b', '2026-02-18T00:00:00Z');
        expect(mocks.getPricingConfigSnapshot).toHaveBeenCalledTimes(4);
    });

    it('gera warning estruturado quando snapshot contem campos invalidos', async () => {
        mocks.queryRange.mockResolvedValueOnce([{ id: 'cfg-bad' }]);
        mocks.getPricingConfigSnapshot.mockResolvedValueOnce({
            unidadeId: 'u-test',
            unidadeCodigo: 'MATRIZ',
            unidadeNome: 'Matriz',
            currency: 'BRL',
            configVersionId: 'cfg-bad',
            configVersion: 2,
            aplicarTaxaAntesDesconto: false,
            base12h: {
                CUIDADOR: 180,
                AUXILIAR_ENF: 240,
                TECNICO_ENF: 300,
                ENFERMEIRO: 360,
            },
            adicionaisPercent: {
                segundoPaciente: 150,
                noturno: -5,
                fimSemana: 20,
                feriado: 20,
                altoRisco: 15,
                at: 0,
                aa: 0,
            },
            adicionaisEscalaHoras: { at: true, aa: true },
            margemPercent: 120,
            lucroFixo: 0,
            lucroFixoEscalaHoras: false,
            impostoSobreComissaoPercent: -1,
            hourRules: [{ hora: 12, fatorPercent: 1 }],
            paymentFeeRules: [],
            miniCostRules: [],
            commissionPercentRules: [],
            diseaseRules: [],
            discountPresets: [],
        });

        await getActiveConfig('u-test', '2026-02-18T00:00:00Z');

        expect(mocks.warning).toHaveBeenCalledWith(
            'pricing_config_validation_warning',
            expect.any(String),
            expect.objectContaining({
                configVersionId: 'cfg-bad',
            }),
        );
    });

    it('faz fallback para latest ativo quando query de vigencia falha', async () => {
        mocks.queryRange.mockRejectedValueOnce(new Error('db error'));
        mocks.findVersion.mockResolvedValueOnce({
            id: 'cfg-latest-after-error',
            version: 9,
        });

        const result = await getActiveConfig('u-fallback', '2026-02-18T00:00:00Z');

        expect(result.configVersionId).toBe('cfg-latest-after-error');
    });

    it('lanca erro quando nao existe fallback default ativo', async () => {
        mocks.queryRange.mockResolvedValueOnce([]);
        mocks.findVersion.mockResolvedValueOnce(null);
        mocks.findUnitByCode.mockResolvedValueOnce(null);

        await expect(
            getActiveConfig('u-sem-fallback', '2026-02-18T00:00:00Z'),
        ).rejects.toThrow(/Configuracao ativa nao encontrada/);
    });
});
