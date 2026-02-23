import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({
    validateOrigin: vi.fn().mockReturnValue(true),
}));

vi.mock('@/lib/csrf', () => ({
    validateOrigin: mocks.validateOrigin,
}));

// Mock auth to just call the inner handler directly
vi.mock('@/auth', () => ({
    auth: vi.fn((handler: (req: NextRequest) => Response | NextResponse) => handler),
}));

// Dynamic import so mocks are in place
const { default: rawMiddleware } = await import('@/middleware');

// Cast to a callable that accepts a single request — the auth mock passes through directly
const middleware = rawMiddleware as unknown as (req: NextRequest) => Promise<NextResponse>;

type AuthRequest = NextRequest & { auth?: { user?: { email?: string } } };

function buildRequest(
    method: string,
    pathname: string,
    headers?: Record<string, string>,
): AuthRequest {
    const url = `http://localhost:3000${pathname}`;
    return new NextRequest(url, { method, headers }) as AuthRequest;
}

function buildAuthedRequest(
    method: string,
    pathname: string,
    headers?: Record<string, string>,
): AuthRequest {
    const req = buildRequest(method, pathname, headers);
    req.auth = { user: { email: 'admin@test.com' } };
    return req;
}

describe('Middleware: Authentication gate', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.validateOrigin.mockReturnValue(true);
    });

    it('returns 401 JSON for unauthenticated API requests', async () => {
        const req = buildRequest('GET', '/api/admin/pacientes');
        const response = await middleware(req);
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('redirects unauthenticated page requests to /login', async () => {
        const req = buildRequest('GET', '/admin/dashboard');
        const response = await middleware(req);

        expect(response.status).toBe(307);
        const location = response.headers.get('location');
        expect(location).toContain('/login');
        expect(location).toContain('callbackUrl');
    });

    it('allows authenticated requests to pass through', async () => {
        const req = buildAuthedRequest('GET', '/api/admin/pacientes');
        const response = await middleware(req);

        expect(response.status).toBe(200);
    });

    it('allows unauthenticated access to /api/auth routes', async () => {
        const req = buildRequest('GET', '/api/auth/providers');
        const response = await middleware(req);

        expect(response.status).toBe(200);
    });

    it('allows unauthenticated access to /api/health', async () => {
        const req = buildRequest('GET', '/api/health');
        const response = await middleware(req);

        expect(response.status).toBe(200);
    });

    it('allows unauthenticated access to /api/whatsapp/webhook', async () => {
        const req = buildRequest('POST', '/api/whatsapp/webhook');
        const response = await middleware(req);

        expect(response.status).toBe(200);
    });

    it('allows unauthenticated access to /login', async () => {
        const req = buildRequest('GET', '/login');
        const response = await middleware(req);

        expect(response.status).toBe(200);
    });

    it('allows unauthenticated access to landing page /', async () => {
        const req = buildRequest('GET', '/');
        const response = await middleware(req);

        expect(response.status).toBe(200);
    });
});

describe('Middleware: CSRF protection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('validates Origin for authenticated API POST requests', async () => {
        mocks.validateOrigin.mockReturnValue(false);
        const req = buildAuthedRequest('POST', '/api/admin/pacientes');
        const response = await middleware(req);
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.error.code).toBe('CSRF_FAILED');
    });

    it('passes when Origin validation succeeds', async () => {
        mocks.validateOrigin.mockReturnValue(true);
        const req = buildAuthedRequest('POST', '/api/admin/pacientes');
        const response = await middleware(req);

        expect(response.status).toBe(200);
    });

    it('skips CSRF for non-API routes', async () => {
        mocks.validateOrigin.mockReturnValue(false);
        const req = buildAuthedRequest('GET', '/admin/dashboard');
        const response = await middleware(req);

        expect(response.status).toBe(200);
        expect(mocks.validateOrigin).not.toHaveBeenCalled();
    });
});
