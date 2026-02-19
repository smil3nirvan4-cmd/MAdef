import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from './auth.config';
import { DEFAULT_WHATSAPP_ADMIN_TAB, normalizeWhatsAppAdminTab } from '@/lib/whatsapp/admin-tabs';

const { auth } = NextAuth(authConfig);

function resolveRequestId(request: Request): string {
    return request.headers.get('x-request-id') || crypto.randomUUID();
}

function nextWithRequestId(request: Request, requestId: string): NextResponse {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-request-id', requestId);

    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
    response.headers.set('x-request-id', requestId);
    return response;
}

function redirectWithRequestId(url: URL, requestId: string): NextResponse {
    const response = NextResponse.redirect(url);
    response.headers.set('x-request-id', requestId);
    return response;
}

function buildCanonicalWhatsAppUrl(url: URL, tab: string): URL {
    const target = new URL(url.toString());
    target.pathname = `/admin/whatsapp/${tab}`;

    const preservedParams = new URLSearchParams();
    url.searchParams.forEach((value, key) => {
        if (key !== 'tab') {
            preservedParams.append(key, value);
        }
    });

    const query = preservedParams.toString();
    target.search = query ? `?${query}` : '';
    return target;
}

export default auth((request) => {
    const requestId = resolveRequestId(request);

    if (request.nextUrl.pathname === '/admin/whatsapp') {
        const legacyTab = request.nextUrl.searchParams.get('tab');
        if (legacyTab) {
            const tab = normalizeWhatsAppAdminTab(legacyTab) || DEFAULT_WHATSAPP_ADMIN_TAB;
            return redirectWithRequestId(buildCanonicalWhatsAppUrl(request.nextUrl, tab), requestId);
        }
    }

    return nextWithRequestId(request, requestId);
});

export const config = {
    matcher: ['/admin/:path*', '/api/admin/:path*', '/api/whatsapp/:path*'],
};
