import { afterEach, describe, expect, it } from 'vitest';
import { isEnterprisePricingEnabledForUnit } from './feature-flags';

const OLD_ENV = {
    ENTERPRISE_PRICING_ENABLED: process.env.ENTERPRISE_PRICING_ENABLED,
    ENTERPRISE_PRICING_ENABLED_UNITS: process.env.ENTERPRISE_PRICING_ENABLED_UNITS,
    ENTERPRISE_PRICING_DISABLED_UNITS: process.env.ENTERPRISE_PRICING_DISABLED_UNITS,
};

afterEach(() => {
    process.env.ENTERPRISE_PRICING_ENABLED = OLD_ENV.ENTERPRISE_PRICING_ENABLED;
    process.env.ENTERPRISE_PRICING_ENABLED_UNITS = OLD_ENV.ENTERPRISE_PRICING_ENABLED_UNITS;
    process.env.ENTERPRISE_PRICING_DISABLED_UNITS = OLD_ENV.ENTERPRISE_PRICING_DISABLED_UNITS;
});

describe('enterprise feature flags', () => {
    it('desabilita globalmente quando flag false', () => {
        process.env.ENTERPRISE_PRICING_ENABLED = 'false';
        expect(isEnterprisePricingEnabledForUnit('MATRIZ')).toBe(false);
    });

    it('permite por default sem lista de unidades', () => {
        process.env.ENTERPRISE_PRICING_ENABLED = 'true';
        process.env.ENTERPRISE_PRICING_ENABLED_UNITS = '';
        expect(isEnterprisePricingEnabledForUnit('MATRIZ')).toBe(true);
    });

    it('aplica allowlist e denylist por unidade', () => {
        process.env.ENTERPRISE_PRICING_ENABLED = 'true';
        process.env.ENTERPRISE_PRICING_ENABLED_UNITS = 'MATRIZ,CWB';
        process.env.ENTERPRISE_PRICING_DISABLED_UNITS = 'CWB';

        expect(isEnterprisePricingEnabledForUnit('MATRIZ')).toBe(true);
        expect(isEnterprisePricingEnabledForUnit('CWB')).toBe(false);
        expect(isEnterprisePricingEnabledForUnit('SPO')).toBe(false);
    });
});
