import { describe, expect, it } from 'vitest';
import { canAccessWhatsAppApi, isPublicWhatsAppRoute, type AdminRole } from './roles';

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
