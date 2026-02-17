export type AdminRole = 'ADMIN' | 'OPERADOR' | 'LEITURA';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function parseEmails(raw: string | undefined): string[] {
    if (!raw) return [];
    return raw
        .split(',')
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean);
}

export function resolveUserRole(email: string | null | undefined): AdminRole {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return 'LEITURA';

    const adminEmails = new Set([
        ...parseEmails(process.env.ADMIN_EMAILS),
        String(process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
    ].filter(Boolean));

    const operadorEmails = new Set(parseEmails(process.env.OPERADOR_EMAILS));
    const leituraEmails = new Set(parseEmails(process.env.LEITURA_EMAILS));

    if (adminEmails.has(normalizedEmail)) return 'ADMIN';
    if (operadorEmails.has(normalizedEmail)) return 'OPERADOR';
    if (leituraEmails.has(normalizedEmail)) return 'LEITURA';

    return 'LEITURA';
}

export function canAccessAdminPage(role: AdminRole, pathname: string): boolean {
    if (role === 'ADMIN') return true;

    if (role === 'OPERADOR') {
        if (pathname.startsWith('/admin/usuarios')) return false;
        if (pathname.startsWith('/admin/whatsapp/settings')) return false;
        return true;
    }

    if (role === 'LEITURA') {
        if (pathname.startsWith('/admin/usuarios')) return false;
        return true;
    }

    return false;
}

export function canAccessAdminApi(role: AdminRole, method: string, pathname: string): boolean {
    if (role === 'ADMIN') return true;

    const normalizedMethod = method.toUpperCase();
    if (role === 'LEITURA') {
        return SAFE_METHODS.has(normalizedMethod);
    }

    // OPERADOR
    if (!SAFE_METHODS.has(normalizedMethod)) {
        if (pathname.startsWith('/api/admin/usuarios')) return false;
        if (pathname.startsWith('/api/admin/whatsapp/settings')) return false;
    }
    return true;
}

