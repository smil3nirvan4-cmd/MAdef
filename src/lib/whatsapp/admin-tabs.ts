export const WHATSAPP_ADMIN_TABS = [
    'connection',
    'chats',
    'contacts',
    'flows',
    'templates',
    'quickreplies',
    'autoreplies',
    'scheduled',
    'broadcast',
    'queue',
    'labels',
    'blacklist',
    'webhooks',
    'analytics',
    'automation',
    'config',
] as const;

export type WhatsAppAdminTab = (typeof WHATSAPP_ADMIN_TABS)[number];
export const DEFAULT_WHATSAPP_ADMIN_TAB: WhatsAppAdminTab = 'connection';

const WHATSAPP_ADMIN_TAB_SET = new Set<string>(WHATSAPP_ADMIN_TABS);
const TAB_ALIASES: Record<string, WhatsAppAdminTab> = {
    settings: 'automation',
    'quick-replies': 'quickreplies',
    quickreply: 'quickreplies',
    'auto-replies': 'autoreplies',
    'auto-reply': 'autoreplies',
    'flow-definitions': 'flows',
};

export function normalizeWhatsAppAdminTab(raw: string | null | undefined): WhatsAppAdminTab | null {
    const normalized = String(raw || '').trim().toLowerCase();
    if (!normalized) return null;

    const aliased = TAB_ALIASES[normalized] || normalized;
    if (!WHATSAPP_ADMIN_TAB_SET.has(aliased)) {
        return null;
    }

    return aliased as WhatsAppAdminTab;
}
