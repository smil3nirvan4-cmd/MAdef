import { describe, expect, it } from 'vitest';
import { canAccessAdminApi, canAccessAdminPage, canAccessWhatsAppApi, isPublicWhatsAppRoute, type AdminRole } from './roles';

function access(role: AdminRole, method: string, pathname: string): boolean {
    return canAccessWhatsAppApi(role, method, pathname);
}

describe('whatsapp api role allowlist', () => {
    it('keeps webhook POST public', () => {
        expect(isPublicWhatsAppRoute('/api/whatsapp/webhook', 'POST')).toBe(true);
        expect(isPublicWhatsAppRoute('/api/whatsapp/webhook/', 'POST')).toBe(true);
    });

    it('does not expose non-public webhook methods', () => {
        expect(isPublicWhatsAppRoute('/api/whatsapp/webhook', 'GET')).toBe(false);
        expect(access('LEITURA', 'GET', '/api/whatsapp/webhook')).toBe(false);
        expect(access('ADMIN', 'GET', '/api/whatsapp/webhook')).toBe(true);
    });

    it('allows OPERADOR and ADMIN to control connection routes', () => {
        expect(access('OPERADOR', 'POST', '/api/whatsapp/connect')).toBe(true);
        expect(access('OPERADOR', 'POST', '/api/whatsapp/disconnect')).toBe(true);
        expect(access('OPERADOR', 'POST', '/api/whatsapp/reset-auth')).toBe(true);
        expect(access('ADMIN', 'POST', '/api/whatsapp/connect')).toBe(true);
    });

    it('blocks LEITURA from whatsapp control and status routes', () => {
        expect(access('LEITURA', 'POST', '/api/whatsapp/connect')).toBe(false);
        expect(access('LEITURA', 'GET', '/api/whatsapp/status')).toBe(false);
        expect(access('LEITURA', 'GET', '/api/whatsapp/queue')).toBe(false);
    });

    it('keeps data dump admin-only', () => {
        expect(access('OPERADOR', 'GET', '/api/whatsapp/data-dump')).toBe(false);
        expect(access('ADMIN', 'GET', '/api/whatsapp/data-dump')).toBe(true);
    });

    it('denies unknown routes by default', () => {
        expect(access('ADMIN', 'DELETE', '/api/whatsapp/connect')).toBe(false);
        expect(access('ADMIN', 'POST', '/api/whatsapp/unknown')).toBe(false);
    });
});

describe('canAccessAdminPage deny-by-default', () => {
    it('allows ADMIN to access any page', () => {
        expect(canAccessAdminPage('ADMIN', '/admin/pacientes')).toBe(true);
        expect(canAccessAdminPage('ADMIN', '/admin/unknown-page')).toBe(true);
    });

    it('denies unknown admin pages for non-ADMIN roles', () => {
        expect(canAccessAdminPage('OPERADOR', '/admin/unknown-page')).toBe(false);
        expect(canAccessAdminPage('LEITURA', '/admin/some-future-page')).toBe(false);
        expect(canAccessAdminPage('FINANCEIRO', '/admin/secret')).toBe(false);
    });

    it('allows known pages based on role capabilities', () => {
        expect(canAccessAdminPage('OPERADOR', '/admin/pacientes')).toBe(true);
        expect(canAccessAdminPage('OPERADOR', '/admin/avaliacoes')).toBe(true);
        expect(canAccessAdminPage('FINANCEIRO', '/admin/orcamentos')).toBe(true);
        expect(canAccessAdminPage('RH', '/admin/candidatos')).toBe(true);
    });
});

describe('canAccessAdminApi deny-by-default', () => {
    it('allows ADMIN to access any API', () => {
        expect(canAccessAdminApi('ADMIN', 'GET', '/api/admin/unknown')).toBe(true);
    });

    it('denies unknown admin APIs for non-ADMIN roles', () => {
        expect(canAccessAdminApi('OPERADOR', 'GET', '/api/admin/unknown-endpoint')).toBe(false);
        expect(canAccessAdminApi('LEITURA', 'GET', '/api/admin/secret')).toBe(false);
        expect(canAccessAdminApi('FINANCEIRO', 'POST', '/api/admin/future-feature')).toBe(false);
    });

    it('allows known APIs based on role capabilities', () => {
        expect(canAccessAdminApi('OPERADOR', 'GET', '/api/admin/pacientes')).toBe(true);
        expect(canAccessAdminApi('OPERADOR', 'POST', '/api/admin/pacientes')).toBe(true);
        expect(canAccessAdminApi('FINANCEIRO', 'GET', '/api/admin/orcamentos')).toBe(true);
        expect(canAccessAdminApi('RH', 'GET', '/api/admin/candidatos')).toBe(true);
    });

    it('blocks LEITURA write operations', () => {
        expect(canAccessAdminApi('LEITURA', 'POST', '/api/admin/pacientes')).toBe(false);
        expect(canAccessAdminApi('LEITURA', 'DELETE', '/api/admin/avaliacoes')).toBe(false);
    });
});
