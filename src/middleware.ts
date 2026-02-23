import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { validateOrigin } from '@/lib/csrf';

const publicPaths = [
    '/api/auth',
    '/api/health',
    '/api/whatsapp/webhook',
    '/login',
    '/register',
    '/forgot-password',
    '/',
];

export default auth((req) => {
    const { pathname } = req.nextUrl;

    const isPublic = publicPaths.some(path =>
        pathname === path || pathname.startsWith(path + '/')
    );
    if (isPublic) return NextResponse.next();

    if (!req.auth) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'Autenticação necessária' } },
                { status: 401 }
            );
        }
        const loginUrl = new URL('/login', req.nextUrl.origin);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // CSRF: Validate Origin header for mutation requests
    if (pathname.startsWith('/api/') && !validateOrigin(req)) {
        return NextResponse.json(
            { success: false, error: { code: 'CSRF_FAILED', message: 'Origin validation failed' } },
            { status: 403 }
        );
    }

    return NextResponse.next();
});

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
