const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function isDevelopmentLikeEnvironment(): boolean {
    return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
}

function isPrivateIpv4(hostname: string): boolean {
    const parts = hostname.split('.');
    if (parts.length !== 4) return false;
    const octets = parts.map((part) => Number(part));
    if (octets.some((value) => Number.isNaN(value) || value < 0 || value > 255)) return false;

    if (octets[0] === 10) return true;
    if (octets[0] === 127) return true;
    if (octets[0] === 192 && octets[1] === 168) return true;
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
    return false;
}

function isForbiddenHost(hostname: string): boolean {
    const lowered = hostname.toLowerCase();
    if (LOCAL_HOSTS.has(lowered)) return true;
    if (lowered.endsWith('.local')) return true;
    if (isPrivateIpv4(lowered)) return true;
    return false;
}

export function assertPublicUrl(rawUrl: string, context = 'URL'): URL {
    let parsed: URL;
    try {
        parsed = new URL(String(rawUrl || '').trim());
    } catch {
        throw new Error(`${context} invalida: formato nao reconhecido.`);
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error(`${context} invalida: protocolo deve ser http/https.`);
    }

    const isDevLike = isDevelopmentLikeEnvironment();
    if (!isDevLike) {
        if (parsed.protocol !== 'https:') {
            throw new Error(`${context} invalida: HTTPS e obrigatorio fora de desenvolvimento.`);
        }
        if (isForbiddenHost(parsed.hostname)) {
            throw new Error(`${context} invalida: host local/privado nao permitido fora de desenvolvimento.`);
        }
    }

    return parsed;
}

export function getAppUrl(): string {
    const configured = String(process.env.APP_URL || process.env.NEXT_PUBLIC_URL || '').trim();
    const isDevLike = isDevelopmentLikeEnvironment();

    if (!configured) {
        if (isDevLike) return 'http://localhost:3000';
        throw new Error('APP_URL (ou NEXT_PUBLIC_URL) deve estar configurada fora de desenvolvimento.');
    }

    const parsed = assertPublicUrl(configured, 'APP_URL');
    const pathname = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/+$/, '');
    return `${parsed.origin}${pathname}`;
}

export function buildAppUrl(pathWithQuery: string): string {
    const base = getAppUrl();
    const parsed = new URL(pathWithQuery, `${base}/`);
    return parsed.toString();
}
