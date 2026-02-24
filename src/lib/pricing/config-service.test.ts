import { beforeEach, describe, expect, it, vi } from 'vitest';

/* ------------------------------------------------------------------ */
/*  Hoisted mocks                                                     */
/* ------------------------------------------------------------------ */
const mocks = vi.hoisted(() => ({
    upsertUnidade: vi.fn(),
    findFirstConfigVersion: vi.fn(),
    upsertConfigVersion: vi.fn(),
    findUniqueConfigVersion: vi.fn(),
    findUniqueUnidade: vi.fn(),
    upsertRegraHora: vi.fn(),
    upsertTaxaPagamento: vi.fn(),
    upsertMinicusto: vi.fn(),
    upsertPercentualComissao: vi.fn(),
    upsertDescontoPreset: vi.fn(),
    upsertDoencaRegra: vi.fn(),
    findManyRegraHora: vi.fn(),
    findManyTaxaPagamento: vi.fn(),
    findManyMinicusto: vi.fn(),
    findManyPercentualComissao: vi.fn(),
    findManyDoencaRegra: vi.fn(),
    findManyDescontoPreset: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
    prisma: {
        unidade: {
            upsert: mocks.upsertUnidade,
            findUnique: mocks.findUniqueUnidade,
        },
        unidadeConfiguracaoVersao: {
            findFirst: mocks.findFirstConfigVersion,
            upsert: mocks.upsertConfigVersion,
            findUnique: mocks.findUniqueConfigVersion,
        },
        unidadeRegraHora: {
            upsert: mocks.upsertRegraHora,
            findMany: mocks.findManyRegraHora,
        },
        unidadeTaxaPagamento: {
            upsert: mocks.upsertTaxaPagamento,
            findMany: mocks.findManyTaxaPagamento,
        },
        unidadeMinicusto: {
            upsert: mocks.upsertMinicusto,
            findMany: mocks.findManyMinicusto,
        },
        unidadePercentualComissao: {
            upsert: mocks.upsertPercentualComissao,
            findMany: mocks.findManyPercentualComissao,
        },
        unidadeDescontoPreset: {
            upsert: mocks.upsertDescontoPreset,
            findMany: mocks.findManyDescontoPreset,
        },
        unidadeDoencaRegra: {
            upsert: mocks.upsertDoencaRegra,
            findMany: mocks.findManyDoencaRegra,
        },
    },
}));

import {
    ensureDefaultPricingConfig,
    getPricingConfigSnapshot,
} from './config-service';

/* ------------------------------------------------------------------ */
/*  Shared fixtures                                                   */
/* ------------------------------------------------------------------ */
const UNIT = { id: 'unit-1', codigo: 'MATRIZ', nome: 'Unidade Matriz', moeda: 'BRL' };

const CONFIG_VERSION = {
    id: 'cv-1',
    unidadeId: 'unit-1',
    version: 1,
    isActive: true,
    isDraft: false,
    nome: 'Configuracao Inicial',
    descricao: 'Versao inicial padrao da matriz',
    baseCuidador12h: 180,
    baseAuxiliarEnf12h: 240,
    baseTecnicoEnf12h: 300,
    baseEnfermeiro12h: 360,
    margemPercent: 32,
    lucroFixo: 0,
    lucroFixoEscalaHoras: false,
    adicionalSegundoPacientePercent: 50,
    adicionalNoturnoPercent: 20,
    adicionalFimSemanaPercent: 20,
    adicionalFeriadoPercent: 20,
    adicionalAltoRiscoPercent: 15,
    adicionalAtPercent: 0,
    adicionalAaPercent: 0,
    adicionalAtEscalaHoras: true,
    adicionalAaEscalaHoras: true,
    impostoSobreComissaoPercent: 6,
    aplicarTaxaAntesDesconto: false,
};

const SAMPLE_HOUR_RULES = [
    { hora: 6, fatorPercent: 0.6, ativa: true },
    { hora: 12, fatorPercent: 1.0, ativa: true },
];

const SAMPLE_PAYMENT_FEES = [
    { metodo: 'PIX', periodo: 'SEMANAL', taxaPercent: 0, ativa: true },
    { metodo: 'CARTAO_CREDITO', periodo: 'MENSAL', taxaPercent: 4, ativa: true },
];

const SAMPLE_MINI_COSTS = [
    { tipo: 'VISITA_SUPERVISAO', nome: 'Visita de supervisao', valor: 35, escalaHoras: false, ativoPadrao: true, opcionalNoFechamento: true },
];

const SAMPLE_COMMISSION_PERCENTS = [
    { tipo: 'MARKETING', nome: 'Marketing', percentual: 3.5, ativo: true },
];

const SAMPLE_DISEASE_RULES = [
    { codigo: 'ALZHEIMER', nome: 'Alzheimer', complexidade: 'MEDIA', profissionalMinimo: 'AUXILIAR_ENF', adicionalPercent: 8, ativa: true },
];

const SAMPLE_DISCOUNT_PRESETS = [
    { nome: 'SEMANAL_2', percentual: 2, ativo: true },
];

/* ------------------------------------------------------------------ */
/*  Helper: set up mocks for a successful ensureDefaultPricingConfig  */
/* ------------------------------------------------------------------ */
function setupDefaultMocks(overrides?: {
    activeVersion?: typeof CONFIG_VERSION | null;
    createdVersion?: typeof CONFIG_VERSION | null;
}) {
    mocks.upsertUnidade.mockResolvedValue(UNIT);

    const activeVersion = overrides?.activeVersion !== undefined
        ? overrides.activeVersion
        : CONFIG_VERSION;
    mocks.findFirstConfigVersion.mockResolvedValue(activeVersion);

    if (overrides?.createdVersion !== undefined) {
        mocks.upsertConfigVersion.mockResolvedValue(overrides.createdVersion);
    } else {
        mocks.upsertConfigVersion.mockResolvedValue(CONFIG_VERSION);
    }

    // Default rows upserts just resolve
    mocks.upsertRegraHora.mockResolvedValue({});
    mocks.upsertTaxaPagamento.mockResolvedValue({});
    mocks.upsertMinicusto.mockResolvedValue({});
    mocks.upsertPercentualComissao.mockResolvedValue({});
    mocks.upsertDescontoPreset.mockResolvedValue({});
    mocks.upsertDoencaRegra.mockResolvedValue({});
}

function setupSnapshotMocks() {
    mocks.findUniqueUnidade.mockResolvedValue(UNIT);
    mocks.findManyRegraHora.mockResolvedValue(SAMPLE_HOUR_RULES);
    mocks.findManyTaxaPagamento.mockResolvedValue(SAMPLE_PAYMENT_FEES);
    mocks.findManyMinicusto.mockResolvedValue(SAMPLE_MINI_COSTS);
    mocks.findManyPercentualComissao.mockResolvedValue(SAMPLE_COMMISSION_PERCENTS);
    mocks.findManyDoencaRegra.mockResolvedValue(SAMPLE_DISEASE_RULES);
    mocks.findManyDescontoPreset.mockResolvedValue(SAMPLE_DISCOUNT_PRESETS);
}

/* ------------------------------------------------------------------ */
/*  Tests: ensureDefaultPricingConfig                                 */
/* ------------------------------------------------------------------ */
describe('ensureDefaultPricingConfig', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('upserts the default unit and returns existing active version', async () => {
        setupDefaultMocks();

        const result = await ensureDefaultPricingConfig();

        expect(mocks.upsertUnidade).toHaveBeenCalledOnce();
        expect(mocks.upsertUnidade).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { codigo: 'MATRIZ' },
                create: expect.objectContaining({ codigo: 'MATRIZ', nome: 'Unidade Matriz' }),
            }),
        );
        expect(result).toEqual({
            unidadeId: 'unit-1',
            configVersionId: 'cv-1',
        });
    });

    it('creates a new config version when none exists', async () => {
        setupDefaultMocks({ activeVersion: null });

        const result = await ensureDefaultPricingConfig();

        expect(mocks.upsertConfigVersion).toHaveBeenCalledOnce();
        expect(result).toEqual({
            unidadeId: 'unit-1',
            configVersionId: 'cv-1',
        });
    });

    it('seeds all default rows (hour rules, payment fees, etc.)', async () => {
        setupDefaultMocks();

        await ensureDefaultPricingConfig();

        // 12 hour factors
        expect(mocks.upsertRegraHora).toHaveBeenCalledTimes(12);
        // 5 payment fees
        expect(mocks.upsertTaxaPagamento).toHaveBeenCalledTimes(5);
        // 4 mini costs
        expect(mocks.upsertMinicusto).toHaveBeenCalledTimes(4);
        // 4 commission percents
        expect(mocks.upsertPercentualComissao).toHaveBeenCalledTimes(4);
        // 4 discount presets
        expect(mocks.upsertDescontoPreset).toHaveBeenCalledTimes(4);
        // 4 disease rules
        expect(mocks.upsertDoencaRegra).toHaveBeenCalledTimes(4);
    });

    it('handles P2002 unique constraint race condition by re-fetching', async () => {
        mocks.upsertUnidade.mockResolvedValue(UNIT);
        mocks.findFirstConfigVersion
            .mockResolvedValueOnce(null)       // first check: no active version
            .mockResolvedValueOnce(CONFIG_VERSION); // re-fetch after race

        // Simulate PrismaClientKnownRequestError with code P2002
        const prismaError = new Error('Unique constraint failed');
        Object.defineProperty(prismaError, 'code', { value: 'P2002' });
        // We also need the constructor name check. Use a class-like approach:
        const { Prisma } = await import('@prisma/client');
        let p2002Error: Error;
        try {
            p2002Error = new Prisma.PrismaClientKnownRequestError(
                'Unique constraint failed',
                { code: 'P2002', clientVersion: '6.0.0' },
            );
        } catch {
            // If Prisma constructor is not available in test env, fabricate one
            p2002Error = prismaError;
            Object.setPrototypeOf(p2002Error, Prisma.PrismaClientKnownRequestError.prototype);
        }

        mocks.upsertConfigVersion.mockRejectedValue(p2002Error);

        // The default rows upserts
        mocks.upsertRegraHora.mockResolvedValue({});
        mocks.upsertTaxaPagamento.mockResolvedValue({});
        mocks.upsertMinicusto.mockResolvedValue({});
        mocks.upsertPercentualComissao.mockResolvedValue({});
        mocks.upsertDescontoPreset.mockResolvedValue({});
        mocks.upsertDoencaRegra.mockResolvedValue({});

        const result = await ensureDefaultPricingConfig();

        expect(result).toEqual({
            unidadeId: 'unit-1',
            configVersionId: 'cv-1',
        });
    });

    it('throws non-P2002 errors from upsert', async () => {
        mocks.upsertUnidade.mockResolvedValue(UNIT);
        mocks.findFirstConfigVersion.mockResolvedValue(null);

        const genericError = new Error('Database connection lost');
        mocks.upsertConfigVersion.mockRejectedValue(genericError);

        await expect(ensureDefaultPricingConfig()).rejects.toThrow('Database connection lost');
    });

    it('throws when active version cannot be found after race condition', async () => {
        mocks.upsertUnidade.mockResolvedValue(UNIT);
        mocks.findFirstConfigVersion
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null); // still null after re-fetch

        const { Prisma } = await import('@prisma/client');
        let p2002Error: Error;
        try {
            p2002Error = new Prisma.PrismaClientKnownRequestError(
                'Unique constraint failed',
                { code: 'P2002', clientVersion: '6.0.0' },
            );
        } catch {
            p2002Error = new Error('Unique constraint failed');
            Object.setPrototypeOf(p2002Error, Prisma.PrismaClientKnownRequestError.prototype);
        }

        mocks.upsertConfigVersion.mockRejectedValue(p2002Error);

        await expect(ensureDefaultPricingConfig()).rejects.toThrow(
            'Falha ao inicializar configuracao padrao da unidade',
        );
    });
});

/* ------------------------------------------------------------------ */
/*  Tests: getPricingConfigSnapshot                                   */
/* ------------------------------------------------------------------ */
describe('getPricingConfigSnapshot', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Setup ensureDefaultPricingConfig to succeed
        setupDefaultMocks();
        setupSnapshotMocks();
    });

    it('returns a full snapshot with default unit code when no options given', async () => {
        const snapshot = await getPricingConfigSnapshot();

        expect(snapshot.unidadeId).toBe('unit-1');
        expect(snapshot.unidadeCodigo).toBe('MATRIZ');
        expect(snapshot.unidadeNome).toBe('Unidade Matriz');
        expect(snapshot.currency).toBe('BRL');
        expect(snapshot.configVersionId).toBe('cv-1');
        expect(snapshot.configVersion).toBe(1);
    });

    it('returns base12h with all professional types', async () => {
        const snapshot = await getPricingConfigSnapshot();

        expect(snapshot.base12h).toEqual({
            CUIDADOR: 180,
            AUXILIAR_ENF: 240,
            TECNICO_ENF: 300,
            ENFERMEIRO: 360,
        });
    });

    it('falls back ENFERMEIRO to TECNICO_ENF base when baseEnfermeiro12h is null', async () => {
        const versionNoEnf = { ...CONFIG_VERSION, baseEnfermeiro12h: null };
        mocks.findFirstConfigVersion.mockResolvedValue(versionNoEnf);

        const snapshot = await getPricingConfigSnapshot();

        expect(snapshot.base12h.ENFERMEIRO).toBe(300); // baseTecnicoEnf12h
    });

    it('returns adicionaisPercent from config version', async () => {
        const snapshot = await getPricingConfigSnapshot();

        expect(snapshot.adicionaisPercent).toEqual({
            segundoPaciente: 50,
            noturno: 20,
            fimSemana: 20,
            feriado: 20,
            altoRisco: 15,
            at: 0,
            aa: 0,
        });
    });

    it('returns adicionaisEscalaHoras from config version', async () => {
        const snapshot = await getPricingConfigSnapshot();

        expect(snapshot.adicionaisEscalaHoras).toEqual({
            at: true,
            aa: true,
        });
    });

    it('returns hour rules sorted by hora', async () => {
        // Provide unsorted data
        mocks.findManyRegraHora.mockResolvedValue([
            { hora: 12, fatorPercent: 1.0, ativa: true },
            { hora: 6, fatorPercent: 0.6, ativa: true },
        ]);

        const snapshot = await getPricingConfigSnapshot();

        expect(snapshot.hourRules).toEqual([
            { hora: 6, fatorPercent: 0.6 },
            { hora: 12, fatorPercent: 1.0 },
        ]);
    });

    it('returns payment fee rules mapped correctly', async () => {
        const snapshot = await getPricingConfigSnapshot();

        expect(snapshot.paymentFeeRules).toEqual([
            { metodo: 'PIX', periodo: 'SEMANAL', taxaPercent: 0, ativa: true },
            { metodo: 'CARTAO_CREDITO', periodo: 'MENSAL', taxaPercent: 4, ativa: true },
        ]);
    });

    it('returns mini cost rules mapped correctly', async () => {
        const snapshot = await getPricingConfigSnapshot();

        expect(snapshot.miniCostRules).toEqual([
            {
                tipo: 'VISITA_SUPERVISAO',
                nome: 'Visita de supervisao',
                valor: 35,
                escalaHoras: false,
                ativoPadrao: true,
                opcionalNoFechamento: true,
            },
        ]);
    });

    it('returns commission rules mapped correctly', async () => {
        const snapshot = await getPricingConfigSnapshot();

        expect(snapshot.commissionPercentRules).toEqual([
            { tipo: 'MARKETING', nome: 'Marketing', percentual: 3.5, ativo: true },
        ]);
    });

    it('returns disease rules mapped correctly', async () => {
        const snapshot = await getPricingConfigSnapshot();

        expect(snapshot.diseaseRules).toEqual([
            {
                codigo: 'ALZHEIMER',
                nome: 'Alzheimer',
                complexidade: 'MEDIA',
                profissionalMinimo: 'AUXILIAR_ENF',
                adicionalPercent: 8,
                ativa: true,
            },
        ]);
    });

    it('returns discount presets mapped correctly', async () => {
        const snapshot = await getPricingConfigSnapshot();

        expect(snapshot.discountPresets).toEqual([
            { nome: 'SEMANAL_2', percentual: 2, ativo: true },
        ]);
    });

    it('looks up by configVersionId when provided', async () => {
        mocks.findUniqueConfigVersion.mockResolvedValue({
            ...CONFIG_VERSION,
            id: 'cv-specific',
            unidadeId: 'unit-1',
        });

        const snapshot = await getPricingConfigSnapshot({ configVersionId: 'cv-specific' });

        expect(mocks.findUniqueConfigVersion).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'cv-specific' } }),
        );
        expect(snapshot.configVersionId).toBe('cv-specific');
    });

    it('throws when configVersionId is provided but not found', async () => {
        mocks.findUniqueConfigVersion.mockResolvedValue(null);

        await expect(
            getPricingConfigSnapshot({ configVersionId: 'nonexistent' }),
        ).rejects.toThrow('Configuracao solicitada nao encontrada');
    });

    it('looks up by unidadeId when provided', async () => {
        mocks.findUniqueUnidade.mockResolvedValue({
            id: 'unit-custom',
            codigo: 'FILIAL',
            nome: 'Filial',
            moeda: 'BRL',
        });
        mocks.findFirstConfigVersion.mockResolvedValue({
            ...CONFIG_VERSION,
            unidadeId: 'unit-custom',
        });

        const snapshot = await getPricingConfigSnapshot({ unidadeId: 'unit-custom' });

        expect(mocks.findUniqueUnidade).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'unit-custom' } }),
        );
        expect(snapshot.unidadeCodigo).toBe('FILIAL');
    });

    it('looks up by unidadeCodigo when provided', async () => {
        mocks.findUniqueUnidade.mockResolvedValue({
            id: 'unit-by-code',
            codigo: 'FILIAL_SP',
            nome: 'Filial SP',
            moeda: 'USD',
        });
        mocks.findFirstConfigVersion.mockResolvedValue({
            ...CONFIG_VERSION,
            unidadeId: 'unit-by-code',
        });

        const snapshot = await getPricingConfigSnapshot({ unidadeCodigo: 'FILIAL_SP' });

        expect(mocks.findUniqueUnidade).toHaveBeenCalledWith(
            expect.objectContaining({ where: { codigo: 'FILIAL_SP' } }),
        );
        expect(snapshot.currency).toBe('USD');
    });

    it('throws when unidade is not found', async () => {
        mocks.findUniqueUnidade.mockResolvedValue(null);

        await expect(
            getPricingConfigSnapshot({ unidadeId: 'nonexistent-unit' }),
        ).rejects.toThrow();
    });

    it('throws when no active config version found for the unit', async () => {
        // findFirstConfigVersion for the snapshot lookup (second call) returns null
        // The first call is inside ensureDefaultPricingConfig which has its own mock
        mocks.findUniqueUnidade.mockResolvedValue(UNIT);
        // Override: after ensureDefaultPricingConfig, the snapshot query also calls findFirst
        // But ensureDefaultPricingConfig calls it first, then getPricingConfigSnapshot calls it again
        // We need the first call to succeed (for ensureDefault) and the second to return null
        mocks.findFirstConfigVersion
            .mockResolvedValueOnce(CONFIG_VERSION)  // ensureDefault
            .mockResolvedValueOnce(null);            // snapshot lookup

        await expect(getPricingConfigSnapshot()).rejects.toThrow();
    });

    it('uses moeda from unidade as currency, defaults to BRL when null', async () => {
        mocks.findUniqueUnidade.mockResolvedValue({
            ...UNIT,
            moeda: null,
        });

        const snapshot = await getPricingConfigSnapshot();

        expect(snapshot.currency).toBe('BRL');
    });

    it('returns margemPercent and lucroFixo from config version', async () => {
        const snapshot = await getPricingConfigSnapshot();

        expect(snapshot.margemPercent).toBe(32);
        expect(snapshot.lucroFixo).toBe(0);
        expect(snapshot.lucroFixoEscalaHoras).toBe(false);
    });

    it('returns impostoSobreComissaoPercent from config version', async () => {
        const snapshot = await getPricingConfigSnapshot();

        expect(snapshot.impostoSobreComissaoPercent).toBe(6);
    });

    it('returns aplicarTaxaAntesDesconto from config version', async () => {
        const snapshot = await getPricingConfigSnapshot();

        expect(snapshot.aplicarTaxaAntesDesconto).toBe(false);
    });

    it('prioritizes configVersionId over unidadeId and unidadeCodigo', async () => {
        // Provide all three options; configVersionId should win
        mocks.findUniqueConfigVersion.mockResolvedValue({
            ...CONFIG_VERSION,
            id: 'cv-priority',
            unidadeId: 'unit-1',
        });

        const snapshot = await getPricingConfigSnapshot({
            configVersionId: 'cv-priority',
            unidadeId: 'unit-other',
            unidadeCodigo: 'OTHER',
        });

        expect(mocks.findUniqueConfigVersion).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'cv-priority' } }),
        );
        // The unidade lookup uses the unidadeId from the config version, not the option
        expect(mocks.findUniqueUnidade).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'unit-1' } }),
        );
        expect(snapshot.configVersionId).toBe('cv-priority');
    });

    it('uses configVersion from found config version (not from lookup)', async () => {
        mocks.findUniqueConfigVersion.mockResolvedValue({
            ...CONFIG_VERSION,
            id: 'cv-v3',
            version: 3,
        });

        const snapshot = await getPricingConfigSnapshot({ configVersionId: 'cv-v3' });

        expect(snapshot.configVersion).toBe(3);
    });

    it('fetches all rule types in parallel via Promise.all', async () => {
        const snapshot = await getPricingConfigSnapshot();

        // All findMany mocks should have been called once
        expect(mocks.findManyRegraHora).toHaveBeenCalledOnce();
        expect(mocks.findManyTaxaPagamento).toHaveBeenCalledOnce();
        expect(mocks.findManyMinicusto).toHaveBeenCalledOnce();
        expect(mocks.findManyPercentualComissao).toHaveBeenCalledOnce();
        expect(mocks.findManyDoencaRegra).toHaveBeenCalledOnce();
        expect(mocks.findManyDescontoPreset).toHaveBeenCalledOnce();

        // And they're all filtered by configVersionId
        expect(mocks.findManyRegraHora).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ configVersionId: 'cv-1' }) }),
        );
    });

    it('handles empty rule arrays', async () => {
        mocks.findManyRegraHora.mockResolvedValue([]);
        mocks.findManyTaxaPagamento.mockResolvedValue([]);
        mocks.findManyMinicusto.mockResolvedValue([]);
        mocks.findManyPercentualComissao.mockResolvedValue([]);
        mocks.findManyDoencaRegra.mockResolvedValue([]);
        mocks.findManyDescontoPreset.mockResolvedValue([]);

        const snapshot = await getPricingConfigSnapshot();

        expect(snapshot.hourRules).toEqual([]);
        expect(snapshot.paymentFeeRules).toEqual([]);
        expect(snapshot.miniCostRules).toEqual([]);
        expect(snapshot.commissionPercentRules).toEqual([]);
        expect(snapshot.diseaseRules).toEqual([]);
        expect(snapshot.discountPresets).toEqual([]);
    });
});
