import { describe, expect, it } from 'vitest';
import { DEFAULT_WHATSAPP_ADMIN_TAB, normalizeWhatsAppAdminTab } from './admin-tabs';

describe('normalizeWhatsAppAdminTab', () => {
    it('keeps canonical tabs', () => {
        expect(normalizeWhatsAppAdminTab('templates')).toBe('templates');
        expect(normalizeWhatsAppAdminTab('queue')).toBe('queue');
    });

    it('maps legacy aliases', () => {
        expect(normalizeWhatsAppAdminTab('settings')).toBe('automation');
        expect(normalizeWhatsAppAdminTab('quick-replies')).toBe('quickreplies');
        expect(normalizeWhatsAppAdminTab('flow-definitions')).toBe('flows');
    });

    it('returns null for invalid values', () => {
        expect(normalizeWhatsAppAdminTab('unknown')).toBeNull();
        expect(normalizeWhatsAppAdminTab(null)).toBeNull();
        expect(normalizeWhatsAppAdminTab('')).toBeNull();
    });

    it('has connection as default tab', () => {
        expect(DEFAULT_WHATSAPP_ADMIN_TAB).toBe('connection');
    });
});
