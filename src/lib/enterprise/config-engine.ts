import logger from '@/lib/observability/logger';
import { prisma } from '@/lib/prisma';
import {
    ensureDefaultPricingConfig,
    getPricingConfigSnapshot,
} from '@/lib/pricing/config-service';
import type { PricingConfigSnapshot } from '@/lib/pricing/enterprise-engine';

const DEFAULT_UNIT_CODE = 'MATRIZ';
const CACHE_TTL_MS = 5_000;
const configCache = new Map<string, { expiresAt: number; value: PricingConfigSnapshot }>();

export interface ResolveUnitConfigOptions {
    unidadeId?: string;
    unidadeCodigo?: string;
    configVersionId?: string;
    atDate?: Date | string;
}

function normalizeAtDate(atDate?: Date | string): Date {
    if (atDate instanceof Date) return atDate;
    if (typeof atDate === 'string') {
        const parsed = new Date(atDate);
        if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
}

function cacheKey(unitId?: string, atDate?: Date | string): string {
    const normalizedDate = normalizeAtDate(atDate).toISOString().slice(0, 10);
    return `${unitId || 'default'}:${normalizedDate}`;
}

function readCache(key: string): PricingConfigSnapshot | null {
    const cached = configCache.get(key);
    if (!cached) return null;
    if (cached.expiresAt <= Date.now()) {
        configCache.delete(key);
        return null;
    }
    return cached.value;
}

function writeCache(key: string, value: PricingConfigSnapshot) {
    configCache.set(key, {
        value,
        expiresAt: Date.now() + CACHE_TTL_MS,
    });
}

function validateSnapshot(snapshot: PricingConfigSnapshot) {
    const warnings: string[] = [];
    const validatePercent = (name: string, value: number) => {
        if (!Number.isFinite(value) || value < 0 || value > 100) {
            warnings.push(`${name} fora de faixa 0..100`);
        }
    };

    validatePercent('margemPercent', snapshot.margemPercent);
    validatePercent('impostoSobreComissaoPercent', snapshot.impostoSobreComissaoPercent);
    validatePercent('adicionalSegundoPacientePercent', snapshot.adicionaisPercent.segundoPaciente);
    validatePercent('adicionalNoturnoPercent', snapshot.adicionaisPercent.noturno);
    validatePercent('adicionalFimSemanaPercent', snapshot.adicionaisPercent.fimSemana);
    validatePercent('adicionalFeriadoPercent', snapshot.adicionaisPercent.feriado);
    validatePercent('adicionalAltoRiscoPercent', snapshot.adicionaisPercent.altoRisco);

    const hourSet = new Set(snapshot.hourRules.map((item) => item.hora));
    for (let h = 1; h <= 12; h += 1) {
        if (!hourSet.has(h)) {
            warnings.push(`hourCurve incompleta: faltando hora ${h}`);
        }
    }

    if (warnings.length > 0) {
        logger.warning('pricing_config_validation_warning', 'Config snapshot com warnings de validacao', {
            configVersionId: snapshot.configVersionId,
            unidadeId: snapshot.unidadeId,
            warnings,
        });
    }
}

async function findVersionInEffectiveRange(unidadeId: string, atDate: Date) {
    try {
        const rows = await prisma.$queryRaw<Array<{ id: string }>>`
            SELECT "id"
            FROM "UnidadeConfiguracaoVersao"
            WHERE "unidadeId" = ${unidadeId}
              AND "isActive" = 1
              AND "effectiveFrom" <= ${atDate}
              AND ("effectiveTo" IS NULL OR "effectiveTo" >= ${atDate})
            ORDER BY "effectiveFrom" DESC, "version" DESC
            LIMIT 1
        `;

        if (!rows.length) return null;
        return prisma.unidadeConfiguracaoVersao.findUnique({
            where: { id: rows[0].id },
        });
    } catch {
        // Bancos legados sem as colunas novas de vigencia devem continuar operando
        // com fallback para versao ativa mais recente.
        return null;
    }
}

async function findLatestActiveVersion(unidadeId: string) {
    return prisma.unidadeConfiguracaoVersao.findFirst({
        where: {
            unidadeId,
            isActive: true,
        },
        orderBy: [
            { version: 'desc' },
        ],
    });
}

async function findDefaultUnitActiveVersion(atDate: Date) {
    const defaultUnit = await prisma.unidade.findUnique({
        where: { codigo: DEFAULT_UNIT_CODE },
    });
    if (!defaultUnit) return null;

    const inRange = await findVersionInEffectiveRange(defaultUnit.id, atDate);
    if (inRange) return inRange;

    return findLatestActiveVersion(defaultUnit.id);
}

export async function getActiveConfig(
    unidadeId?: string,
    atDate?: Date | string,
): Promise<PricingConfigSnapshot> {
    const key = cacheKey(unidadeId, atDate);
    const cached = readCache(key);
    if (cached) return cached;

    await ensureDefaultPricingConfig();

    const effectiveDate = normalizeAtDate(atDate);
    let resolvedVersionId: string | null = null;

    if (unidadeId) {
        const inRange = await findVersionInEffectiveRange(unidadeId, effectiveDate);
        if (inRange) {
            resolvedVersionId = inRange.id;
        } else {
            const latest = await findLatestActiveVersion(unidadeId);
            if (latest) {
                resolvedVersionId = latest.id;
            }
        }
    }

    if (!resolvedVersionId) {
        const fallbackVersion = await findDefaultUnitActiveVersion(effectiveDate);
        if (!fallbackVersion) {
            throw new Error('Configuracao ativa nao encontrada para a unidade e sem fallback default');
        }

        resolvedVersionId = fallbackVersion.id;
        await logger.warning(
            'pricing_config_fallback_default',
            'Fallback para configuracao default da matriz',
            {
                unidadeId: unidadeId ?? null,
                effectiveDate: effectiveDate.toISOString(),
                resolvedConfigVersionId: resolvedVersionId,
            },
        );
    }

    const snapshot = await getPricingConfigSnapshot({
        configVersionId: resolvedVersionId,
    });
    validateSnapshot(snapshot);
    writeCache(key, snapshot);
    return snapshot;
}

export function invalidateConfigCache(configVersionId?: string) {
    if (!configVersionId) {
        configCache.clear();
        return;
    }

    for (const [key, value] of configCache.entries()) {
        if (value.value.configVersionId === configVersionId) {
            configCache.delete(key);
        }
    }
}

export async function resolveUnitConfig(
    options?: ResolveUnitConfigOptions,
): Promise<PricingConfigSnapshot> {
    if (options?.configVersionId) {
        return getPricingConfigSnapshot({
            configVersionId: options.configVersionId,
        });
    }

    if (options?.unidadeId) {
        return getActiveConfig(options.unidadeId, options.atDate);
    }

    if (options?.unidadeCodigo) {
        const unit = await prisma.unidade.findUnique({
            where: { codigo: options.unidadeCodigo },
        });
        if (unit?.id) {
            return getActiveConfig(unit.id, options.atDate);
        }
    }

    return getActiveConfig(undefined, options?.atDate);
}
