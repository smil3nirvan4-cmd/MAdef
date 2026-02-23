import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const CSRF_COOKIE = 'csrf-token';
const CSRF_HEADER = 'x-csrf-token';

export function generateCsrfToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

export function setCsrfCookie(response: NextResponse, token: string): NextResponse {
    response.cookies.set(CSRF_COOKIE, token, {
        httpOnly: false, // Must be readable by JS for double-submit pattern
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
    });
    return response;
}

/**
 * Validates CSRF using double-submit cookie pattern.
 * Safe methods (GET, HEAD, OPTIONS) are exempt.
 * Webhook and auth routes are exempt (they have their own validation).
 */
export function validateCsrf(req: NextRequest): boolean {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;

    if (req.nextUrl.pathname.startsWith('/api/whatsapp/webhook')) return true;
    if (req.nextUrl.pathname.startsWith('/api/auth')) return true;

    const cookieToken = req.cookies.get(CSRF_COOKIE)?.value;
    const headerToken = req.headers.get(CSRF_HEADER);

    if (!cookieToken || !headerToken) return false;

    if (cookieToken.length !== headerToken.length) return false;

    return crypto.timingSafeEqual(
        Buffer.from(cookieToken),
        Buffer.from(headerToken)
    );
}

/**
 * Validates Origin header for CSRF protection.
 * This is a simpler check that works without frontend changes.
 * Returns true if the request is safe (same-origin or no Origin header).
 */
export function validateOrigin(req: NextRequest): boolean {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;

    if (req.nextUrl.pathname.startsWith('/api/whatsapp/webhook')) return true;
    if (req.nextUrl.pathname.startsWith('/api/auth')) return true;

    const origin = req.headers.get('origin');
    if (!origin) return true; // Server-to-server requests don't have Origin

    const host = req.headers.get('host');
    if (!host) return true;

    try {
        const originUrl = new URL(origin);
        return originUrl.host === host;
    } catch {
        return false;
    }
}
