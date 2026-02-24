import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    getCapabilities,
    hasCapability,
    requireCapability,
    resolveUserRole,
    canAccessAdminPage,
    canAccessAdminApi,
    CAPABILITIES,
    type AdminRole,
    type Capability,
} from './roles';
import { isWriteBlocked, guardWriteMethod } from './method-guard';

describe('getCapabilities', () => {
    it('ADMIN has ALL capabilities', () => {
        const caps = getCapabilities('ADMIN');
        for (const cap of CAPABILITIES) {
            expect(caps).toContain(cap);
        }
    });

    it('LEITURA has only VIEW capabilities + analytics', () => {
        const caps = getCapabilities('LEITURA');
        expect(caps).toContain('VIEW_WHATSAPP');
        expect(caps).toContain('VIEW_PACIENTES');
        expect(caps).toContain('VIEW_AVALIACOES');
        expect(caps).toContain('VIEW_ORCAMENTOS');
        expect(caps).toContain('VIEW_LOGS');
        expect(caps).toContain('VIEW_ANALYTICS');
        expect(caps).not.toContain('MANAGE_USERS');
        expect(caps).not.toContain('SEND_WHATSAPP');
    });

    it('OPERADOR can send whatsapp but not manage users', () => {
        const caps = getCapabilities('OPERADOR');
        expect(caps).toContain('SEND_WHATSAPP');
        expect(caps).toContain('VIEW_WHATSAPP');
        expect(caps).not.toContain('MANAGE_USERS');
        expect(caps).not.toContain('MANAGE_SETTINGS');
    });

    it('FINANCEIRO can manage orcamentos and send propostas', () => {
        const caps = getCapabilities('FINANCEIRO');
        expect(caps).toContain('VIEW_ORCAMENTOS');
        expect(caps).toContain('MANAGE_ORCAMENTOS');
        expect(caps).toContain('SEND_PROPOSTA');
        expect(caps).toContain('SEND_CONTRATO');
    });

    it('RH has VIEW_RH and MANAGE_RH', () => {
        const caps = getCapabilities('RH');
        expect(caps).toContain('VIEW_RH');
        expect(caps).toContain('MANAGE_RH');
        expect(caps).not.toContain('MANAGE_USERS');
    });

    it('SUPERVISOR has broad access but not MANAGE_USERS/SETTINGS', () => {
        const caps = getCapabilities('SUPERVISOR');
        expect(caps).toContain('MANAGE_PACIENTES');
        expect(caps).toContain('MANAGE_AVALIACOES');
        expect(caps).toContain('MANAGE_ALOCACOES');
        expect(caps).toContain('MANAGE_RH');
        expect(caps).not.toContain('MANAGE_USERS');
        expect(caps).not.toContain('MANAGE_SETTINGS');
    });

    it('returns empty array for unknown role', () => {
        expect(getCapabilities('UNKNOWN' as AdminRole)).toEqual([]);
    });
});

describe('hasCapability', () => {
    it('returns true when role has the capability', () => {
        expect(hasCapability('ADMIN', 'MANAGE_USERS')).toBe(true);
    });

    it('returns false when role lacks the capability', () => {
        expect(hasCapability('LEITURA', 'MANAGE_USERS')).toBe(false);
    });
});

describe('requireCapability', () => {
    it('does not throw when role has capability', () => {
        expect(() => requireCapability('ADMIN', 'MANAGE_USERS')).not.toThrow();
    });

    it('throws FORBIDDEN when role lacks capability', () => {
        try {
            requireCapability('LEITURA', 'MANAGE_USERS');
            expect.fail('should have thrown');
        } catch (e: unknown) {
            const err = e as { code: string; message: string };
            expect(err.code).toBe('FORBIDDEN');
            expect(err.message).toContain('MANAGE_USERS');
        }
    });
});

describe('resolveUserRole', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        process.env.ADMIN_EMAILS = 'admin@test.com';
        process.env.ADMIN_EMAIL = 'superadmin@test.com';
        process.env.SUPERVISOR_EMAILS = 'supervisor@test.com';
        process.env.FINANCEIRO_EMAILS = 'fin@test.com';
        process.env.RH_EMAILS = 'rh@test.com';
        process.env.OPERADOR_EMAILS = 'op@test.com';
        process.env.LEITURA_EMAILS = 'read@test.com';
    });

    afterEach(() => {
        Object.keys(process.env).forEach(key => {
            if (!(key in originalEnv)) delete process.env[key];
            else process.env[key] = originalEnv[key];
        });
    });

    it('resolves ADMIN from ADMIN_EMAILS', () => {
        expect(resolveUserRole('admin@test.com')).toBe('ADMIN');
    });

    it('resolves ADMIN from ADMIN_EMAIL', () => {
        expect(resolveUserRole('superadmin@test.com')).toBe('ADMIN');
    });

    it('resolves SUPERVISOR', () => {
        expect(resolveUserRole('supervisor@test.com')).toBe('SUPERVISOR');
    });

    it('resolves FINANCEIRO', () => {
        expect(resolveUserRole('fin@test.com')).toBe('FINANCEIRO');
    });

    it('resolves RH', () => {
        expect(resolveUserRole('rh@test.com')).toBe('RH');
    });

    it('resolves OPERADOR', () => {
        expect(resolveUserRole('op@test.com')).toBe('OPERADOR');
    });

    it('returns LEITURA for unknown email', () => {
        expect(resolveUserRole('nobody@test.com')).toBe('LEITURA');
    });

    it('returns LEITURA for null/undefined/empty', () => {
        expect(resolveUserRole(null)).toBe('LEITURA');
        expect(resolveUserRole(undefined)).toBe('LEITURA');
        expect(resolveUserRole('')).toBe('LEITURA');
    });

    it('is case-insensitive', () => {
        expect(resolveUserRole('ADMIN@TEST.COM')).toBe('ADMIN');
    });
});

describe('canAccessAdminPage', () => {
    it('ADMIN can access any page', () => {
        expect(canAccessAdminPage('ADMIN', '/admin/usuarios')).toBe(true);
        expect(canAccessAdminPage('ADMIN', '/admin/whatsapp/settings')).toBe(true);
    });

    it('LEITURA cannot access /admin/usuarios', () => {
        expect(canAccessAdminPage('LEITURA', '/admin/usuarios')).toBe(false);
    });

    it('LEITURA can access /admin/pacientes', () => {
        expect(canAccessAdminPage('LEITURA', '/admin/pacientes')).toBe(true);
    });

    it('LEITURA can access /admin/orcamentos', () => {
        expect(canAccessAdminPage('LEITURA', '/admin/orcamentos')).toBe(true);
    });

    it('LEITURA can access /admin/logs', () => {
        expect(canAccessAdminPage('LEITURA', '/admin/logs')).toBe(true);
    });

    it('RH can access /admin/candidatos', () => {
        expect(canAccessAdminPage('RH', '/admin/candidatos')).toBe(true);
    });

    it('RH cannot access /admin/whatsapp', () => {
        expect(canAccessAdminPage('RH', '/admin/whatsapp')).toBe(false);
    });

    it('OPERADOR cannot access /admin/whatsapp/settings', () => {
        expect(canAccessAdminPage('OPERADOR', '/admin/whatsapp/settings')).toBe(false);
    });

    it('OPERADOR can access /admin/whatsapp', () => {
        expect(canAccessAdminPage('OPERADOR', '/admin/whatsapp')).toBe(true);
    });

    it('returns true for unmatched paths (default)', () => {
        expect(canAccessAdminPage('LEITURA', '/admin/dashboard')).toBe(true);
    });
});

describe('canAccessAdminApi', () => {
    it('ADMIN can access any API', () => {
        expect(canAccessAdminApi('ADMIN', 'DELETE', '/api/admin/usuarios')).toBe(true);
    });

    it('LEITURA is blocked on write methods', () => {
        expect(canAccessAdminApi('LEITURA', 'POST', '/api/admin/pacientes')).toBe(false);
        expect(canAccessAdminApi('LEITURA', 'PUT', '/api/admin/pacientes')).toBe(false);
        expect(canAccessAdminApi('LEITURA', 'DELETE', '/api/admin/pacientes')).toBe(false);
    });

    it('LEITURA can read pacientes', () => {
        expect(canAccessAdminApi('LEITURA', 'GET', '/api/admin/pacientes')).toBe(true);
    });

    it('OPERADOR can write pacientes', () => {
        expect(canAccessAdminApi('OPERADOR', 'POST', '/api/admin/pacientes')).toBe(true);
    });

    it('FINANCEIRO can manage orcamentos', () => {
        expect(canAccessAdminApi('FINANCEIRO', 'POST', '/api/admin/orcamentos')).toBe(true);
        expect(canAccessAdminApi('FINANCEIRO', 'GET', '/api/admin/orcamentos')).toBe(true);
    });

    it('OPERADOR cannot manage usuarios', () => {
        expect(canAccessAdminApi('OPERADOR', 'GET', '/api/admin/usuarios')).toBe(false);
    });

    it('RH can write to candidatos', () => {
        expect(canAccessAdminApi('RH', 'POST', '/api/admin/candidatos')).toBe(true);
    });

    it('OPERADOR can retry/cancel queue items via whatsapp API', () => {
        expect(canAccessAdminApi('OPERADOR', 'POST', '/api/admin/whatsapp')).toBe(true);
    });

    it('LEITURA can read whatsapp API', () => {
        expect(canAccessAdminApi('LEITURA', 'GET', '/api/admin/whatsapp')).toBe(true);
    });
});

describe('isWriteBlocked (method-guard)', () => {
    it('blocks LEITURA on POST', () => {
        expect(isWriteBlocked('LEITURA', 'POST')).toBe(true);
    });

    it('blocks LEITURA on PUT', () => {
        expect(isWriteBlocked('LEITURA', 'PUT')).toBe(true);
    });

    it('blocks LEITURA on PATCH', () => {
        expect(isWriteBlocked('LEITURA', 'PATCH')).toBe(true);
    });

    it('blocks LEITURA on DELETE', () => {
        expect(isWriteBlocked('LEITURA', 'DELETE')).toBe(true);
    });

    it('allows LEITURA on GET', () => {
        expect(isWriteBlocked('LEITURA', 'GET')).toBe(false);
    });

    it('allows ADMIN on any method', () => {
        expect(isWriteBlocked('ADMIN', 'POST')).toBe(false);
        expect(isWriteBlocked('ADMIN', 'DELETE')).toBe(false);
    });

    it('allows OPERADOR on write methods', () => {
        expect(isWriteBlocked('OPERADOR', 'POST')).toBe(false);
    });
});

describe('guardWriteMethod', () => {
    it('throws for LEITURA + POST', () => {
        try {
            guardWriteMethod('LEITURA', 'POST');
            expect.fail('should have thrown');
        } catch (e: unknown) {
            const err = e as { code: string };
            expect(err.code).toBe('FORBIDDEN');
        }
    });

    it('does not throw for ADMIN + DELETE', () => {
        expect(() => guardWriteMethod('ADMIN', 'DELETE')).not.toThrow();
    });
});
