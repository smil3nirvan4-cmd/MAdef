function normalizeSetFromEnv(value: string | undefined): Set<string> {
    return new Set(
        String(value || '')
            .split(',')
            .map((item) => item.trim().toUpperCase())
            .filter(Boolean),
    );
}

export function isEnterprisePricingEnabledForUnit(unitIdOrCode?: string): boolean {
    const normalized = String(unitIdOrCode || '').trim().toUpperCase();
    if (!normalized) return true;

    const globalEnabled = String(process.env.ENTERPRISE_PRICING_ENABLED || 'true').toLowerCase() !== 'false';
    if (!globalEnabled) return false;

    const enabledUnits = normalizeSetFromEnv(process.env.ENTERPRISE_PRICING_ENABLED_UNITS);
    const disabledUnits = normalizeSetFromEnv(process.env.ENTERPRISE_PRICING_DISABLED_UNITS);

    if (disabledUnits.has(normalized)) return false;
    if (enabledUnits.size === 0 || enabledUnits.has('*')) return true;
    return enabledUnits.has(normalized);
}
