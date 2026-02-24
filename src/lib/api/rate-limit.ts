type RateLimitRecord = {
    count: number;
    resetAt: number;
};

const store = new Map<string, RateLimitRecord>();

// Garbage-collect expired entries every 60s
const _gcInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
        if (entry.resetAt <= now) store.delete(key);
    }
}, 60_000);
// Allow process to exit without waiting for GC
if (typeof _gcInterval === 'object' && 'unref' in _gcInterval) {
    _gcInterval.unref();
}

/** Per-route rate limit configs */
export interface RouteRateLimitConfig {
    maxRequests: number;
    windowMs: number;
}

const MUTATION_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

export function resolveRateLimitConfig(pathname: string, method: string): RouteRateLimitConfig {
    // Auth routes: strictest (brute force prevention)
    if (pathname.startsWith('/api/auth')) {
        return { maxRequests: 10, windowMs: 60_000 };
    }
    // WhatsApp webhook: higher limit
    if (pathname.startsWith('/api/whatsapp')) {
        return { maxRequests: 60, windowMs: 60_000 };
    }
    // Admin mutation routes
    if (MUTATION_METHODS.has(method)) {
        return { maxRequests: 30, windowMs: 60_000 };
    }
    // Admin read routes
    return { maxRequests: 100, windowMs: 60_000 };
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    retryAfterMs: number;
}

export function checkRateLimit(
    key: string,
    maxRequests: number,
    windowMs: number,
    now = Date.now(),
): RateLimitResult {
    const safeMax = Math.max(1, Math.floor(maxRequests));
    const safeWindowMs = Math.max(1000, Math.floor(windowMs));
    const current = store.get(key);

    if (!current || current.resetAt <= now) {
        store.set(key, {
            count: 1,
            resetAt: now + safeWindowMs,
        });
        return {
            allowed: true,
            remaining: safeMax - 1,
            retryAfterMs: 0,
        };
    }

    if (current.count >= safeMax) {
        return {
            allowed: false,
            remaining: 0,
            retryAfterMs: Math.max(0, current.resetAt - now),
        };
    }

    current.count += 1;
    store.set(key, current);

    return {
        allowed: true,
        remaining: Math.max(0, safeMax - current.count),
        retryAfterMs: 0,
    };
}

export function getClientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
        return realIp.trim();
    }
    return 'unknown';
}

export function __resetRateLimitStore() {
    store.clear();
}
