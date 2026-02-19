import { isWriteBlocked } from './method-guard';

export type AdminRole = 'ADMIN' | 'OPERADOR' | 'LEITURA' | 'FINANCEIRO' | 'RH' | 'SUPERVISOR';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
type WhatsAppApiAccess = 'PUBLIC' | 'OPERADOR' | 'ADMIN';

interface WhatsAppApiRule {
    method: string;
    pathname: string;
    access: WhatsAppApiAccess;
}

const WHATSAPP_API_RULES: WhatsAppApiRule[] = [
    { method: 'POST', pathname: '/api/whatsapp/webhook', access: 'PUBLIC' },
    { method: 'GET', pathname: '/api/whatsapp/status', access: 'OPERADOR' },
    { method: 'GET', pathname: '/api/whatsapp/messages', access: 'OPERADOR' },
    { method: 'GET', pathname: '/api/whatsapp/queue', access: 'OPERADOR' },
    { method: 'POST', pathname: '/api/whatsapp/connect', access: 'OPERADOR' },
    { method: 'POST', pathname: '/api/whatsapp/disconnect', access: 'OPERADOR' },
    { method: 'POST', pathname: '/api/whatsapp/reset-auth', access: 'OPERADOR' },
    { method: 'POST', pathname: '/api/whatsapp/pair', access: 'OPERADOR' },
    { method: 'GET', pathname: '/api/whatsapp/data-dump', access: 'ADMIN' },
    { method: 'GET', pathname: '/api/whatsapp/webhook', access: 'ADMIN' },
];

export const CAPABILITIES = [
    'MANAGE_USERS',
    'MANAGE_SETTINGS',
    'VIEW_WHATSAPP',
    'SEND_WHATSAPP',
    'MANAGE_WHATSAPP',
    'SEND_PROPOSTA',
    'SEND_CONTRATO',
    'MANAGE_PACIENTES',
    'VIEW_PACIENTES',
    'MANAGE_AVALIACOES',
    'VIEW_AVALIACOES',
    'MANAGE_ORCAMENTOS',
    'VIEW_ORCAMENTOS',
    'MANAGE_ALOCACOES',
    'MANAGE_RH',
    'VIEW_RH',
    'VIEW_LOGS',
    'VIEW_ANALYTICS',
    'RETRY_QUEUE_ITEM',
    'CANCEL_QUEUE_ITEM',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

const ROLE_CAPABILITIES: Record<AdminRole, Capability[]> = {
    ADMIN: [...CAPABILITIES],
    OPERADOR: [
        'VIEW_WHATSAPP', 'SEND_WHATSAPP',
        'SEND_PROPOSTA',
        'VIEW_PACIENTES', 'MANAGE_PACIENTES',
        'VIEW_AVALIACOES', 'MANAGE_AVALIACOES',
        'VIEW_ORCAMENTOS',
        'RETRY_QUEUE_ITEM', 'CANCEL_QUEUE_ITEM',
    ],
    LEITURA: [
        'VIEW_WHATSAPP', 'VIEW_PACIENTES',
        'VIEW_AVALIACOES', 'VIEW_ORCAMENTOS',
        'VIEW_LOGS', 'VIEW_ANALYTICS',
    ],
    FINANCEIRO: [
        'VIEW_WHATSAPP', 'SEND_WHATSAPP',
        'SEND_PROPOSTA', 'SEND_CONTRATO',
        'VIEW_ORCAMENTOS', 'MANAGE_ORCAMENTOS',
        'VIEW_PACIENTES',
    ],
    RH: [
        'VIEW_RH', 'MANAGE_RH',
        'VIEW_PACIENTES',
    ],
    SUPERVISOR: [
        'VIEW_WHATSAPP', 'SEND_WHATSAPP',
        'SEND_PROPOSTA',
        'VIEW_PACIENTES', 'MANAGE_PACIENTES',
        'VIEW_AVALIACOES', 'MANAGE_AVALIACOES',
        'MANAGE_ALOCACOES',
        'VIEW_RH', 'MANAGE_RH',
        'VIEW_LOGS',
        'RETRY_QUEUE_ITEM',
    ],
};

function parseEmails(raw: string | undefined): string[] {
    if (!raw) return [];
    return raw
        .split(',')
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean);
}

function normalizeMethod(method: string): string {
    return String(method || 'GET').toUpperCase();
}

function normalizePathname(pathname: string): string {
    const base = String(pathname || '/').split('?')[0] || '/';
    if (base === '/') return '/';
    const normalized = base.replace(/\/+$/, '');
    return normalized || '/';
}

function findWhatsAppApiRule(method: string, pathname: string): WhatsAppApiRule | null {
    const normalizedMethod = normalizeMethod(method);
    const normalizedPath = normalizePathname(pathname);
    return WHATSAPP_API_RULES.find((rule) => (
        rule.method === normalizedMethod && rule.pathname === normalizedPath
    )) || null;
}

export function getCapabilities(role: AdminRole): Capability[] {
    return ROLE_CAPABILITIES[role] || [];
}

export function hasCapability(role: AdminRole, capability: Capability): boolean {
    return getCapabilities(role).includes(capability);
}

export function requireCapability(role: AdminRole, capability: Capability): void {
    if (hasCapability(role, capability)) return;
    throw {
        code: 'FORBIDDEN',
        message: `Missing capability: ${capability}`,
    };
}

export function resolveUserRole(email: string | null | undefined): AdminRole {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return 'LEITURA';

    const adminEmails = new Set([
        ...parseEmails(process.env.ADMIN_EMAILS),
        String(process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
    ].filter(Boolean));
    const supervisorEmails = new Set(parseEmails(process.env.SUPERVISOR_EMAILS));
    const financeiroEmails = new Set(parseEmails(process.env.FINANCEIRO_EMAILS));
    const rhEmails = new Set(parseEmails(process.env.RH_EMAILS));
    const operadorEmails = new Set(parseEmails(process.env.OPERADOR_EMAILS));
    const leituraEmails = new Set(parseEmails(process.env.LEITURA_EMAILS));

    if (adminEmails.has(normalizedEmail)) return 'ADMIN';
    if (supervisorEmails.has(normalizedEmail)) return 'SUPERVISOR';
    if (financeiroEmails.has(normalizedEmail)) return 'FINANCEIRO';
    if (rhEmails.has(normalizedEmail)) return 'RH';
    if (operadorEmails.has(normalizedEmail)) return 'OPERADOR';
    if (leituraEmails.has(normalizedEmail)) return 'LEITURA';

    return 'LEITURA';
}

export function canAccessAdminPage(role: AdminRole, pathname: string): boolean {
    if (role === 'ADMIN') return true;

    if (pathname.startsWith('/admin/usuarios')) {
        return hasCapability(role, 'MANAGE_USERS');
    }

    if (pathname.startsWith('/admin/whatsapp/settings')) {
        return hasCapability(role, 'MANAGE_SETTINGS');
    }

    if (pathname.startsWith('/admin/whatsapp')) {
        return hasCapability(role, 'VIEW_WHATSAPP');
    }

    if (pathname.startsWith('/admin/pacientes')) {
        return hasCapability(role, 'VIEW_PACIENTES');
    }

    if (pathname.startsWith('/admin/avaliacoes')) {
        return hasCapability(role, 'VIEW_AVALIACOES');
    }

    if (pathname.startsWith('/admin/orcamentos')) {
        return hasCapability(role, 'VIEW_ORCAMENTOS');
    }

    if (pathname.startsWith('/admin/logs')) {
        return hasCapability(role, 'VIEW_LOGS');
    }

    if (pathname.startsWith('/admin/candidatos') || pathname.startsWith('/admin/cuidadores')) {
        return hasCapability(role, 'VIEW_RH');
    }

    return true;
}

export function canAccessAdminApi(role: AdminRole, method: string, pathname: string): boolean {
    if (role === 'ADMIN') return true;
    if (isWriteBlocked(role, method)) return false;

    const normalizedMethod = normalizeMethod(method);
    const isWrite = !SAFE_METHODS.has(normalizedMethod);

    if (pathname.startsWith('/api/admin/usuarios')) {
        return hasCapability(role, 'MANAGE_USERS');
    }

    if (pathname.startsWith('/api/admin/whatsapp/settings')) {
        return hasCapability(role, 'MANAGE_SETTINGS');
    }

    if (pathname.startsWith('/api/admin/whatsapp')) {
        if (!isWrite) return hasCapability(role, 'VIEW_WHATSAPP');
        return hasCapability(role, 'MANAGE_WHATSAPP')
            || hasCapability(role, 'SEND_WHATSAPP')
            || hasCapability(role, 'SEND_PROPOSTA')
            || hasCapability(role, 'SEND_CONTRATO')
            || hasCapability(role, 'RETRY_QUEUE_ITEM')
            || hasCapability(role, 'CANCEL_QUEUE_ITEM');
    }

    if (pathname.startsWith('/api/admin/pacientes')) {
        return isWrite ? hasCapability(role, 'MANAGE_PACIENTES') : hasCapability(role, 'VIEW_PACIENTES');
    }

    if (pathname.startsWith('/api/admin/avaliacoes')) {
        return isWrite ? hasCapability(role, 'MANAGE_AVALIACOES') : hasCapability(role, 'VIEW_AVALIACOES');
    }

    if (pathname.startsWith('/api/admin/orcamentos')) {
        return isWrite ? hasCapability(role, 'MANAGE_ORCAMENTOS') : hasCapability(role, 'VIEW_ORCAMENTOS');
    }

    if (pathname.startsWith('/api/admin/alocacoes')) {
        return hasCapability(role, 'MANAGE_ALOCACOES');
    }

    if (pathname.startsWith('/api/admin/candidatos') || pathname.startsWith('/api/admin/cuidadores')) {
        return isWrite ? hasCapability(role, 'MANAGE_RH') : hasCapability(role, 'VIEW_RH');
    }

    if (pathname.startsWith('/api/admin/logs')) {
        return hasCapability(role, 'VIEW_LOGS');
    }

    return true;
}

export function isPublicWhatsAppRoute(pathname: string, method: string): boolean {
    const rule = findWhatsAppApiRule(method, pathname);
    return rule?.access === 'PUBLIC';
}

export function canAccessWhatsAppApi(role: AdminRole, method: string, pathname: string): boolean {
    const rule = findWhatsAppApiRule(method, pathname);
    if (!rule) return false;

    if (rule.access === 'PUBLIC') {
        return true;
    }

    if (rule.access === 'ADMIN') {
        return role === 'ADMIN';
    }

    return role === 'ADMIN' || role === 'OPERADOR';
}
