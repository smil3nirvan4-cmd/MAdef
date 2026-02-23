import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({
    validateOrigin: vi.fn().mockReturnValue(true),
    normalizeWhatsAppAdminTab: vi.fn(),
}));

vi.mock('@/lib/csrf', () => ({
    validateOrigin: mocks.validateOrigin,
}));

vi.mock('@/lib/whatsapp/admin-tabs', () => ({
    DEFAULT_WHATSAPP_ADMIN_TAB: 'conversations',
    normalizeWhatsAppAdminTab: mocks.normalizeWhatsAppAdminTab,
}));

// Mock next-auth so NextAuth(config) returns { auth: fn that passes through }
vi.mock('next-auth', () => ({
    default: vi.fn(() => ({
        auth: vi.fn((handler: (req: NextRequest) => Response | NextResponse) => handler),
    })),
}));

vi.mock('./auth.config', () => ({
    authConfig: {},
}));

// Dynamic import so mocks are in place
const { default: rawProxy } = await import('@/proxy');

// Cast to a callable — the auth mock passes through directly
const proxy = rawProxy as unknown as (req: NextRequest) => Promise<NextResponse>;

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

describe('Proxy: Request ID tracking', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.validateOrigin.mockReturnValue(true);
    });

    it('generates x-request-id when none present', async () => {
        const req = buildRequest('GET', '/');
        const response = await proxy(req);

        expect(response.headers.get('x-request-id')).toBeTruthy();
    });

    it('preserves existing x-request-id', async () => {
        const req = buildRequest('GET', '/', { 'x-request-id': 'test-id-123' });
        const response = await proxy(req);

        expect(response.headers.get('x-request-id')).toBe('test-id-123');
    });
});

describe('Proxy: CSRF protection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('blocks authenticated API POST with invalid Origin', async () => {
        mocks.validateOrigin.mockReturnValue(false);
        const req = buildAuthedRequest('POST', '/api/admin/pacientes');
        const response = await proxy(req);
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.error.code).toBe('CSRF_FAILED');
    });

    it('passes when Origin validation succeeds', async () => {
        mocks.validateOrigin.mockReturnValue(true);
        const req = buildAuthedRequest('POST', '/api/admin/pacientes');
        const response = await proxy(req);

        expect(response.status).toBe(200);
    });

    it('skips CSRF for unauthenticated requests', async () => {
        mocks.validateOrigin.mockReturnValue(false);
        const req = buildRequest('POST', '/api/admin/pacientes');
        // No .auth set — unauthenticated
        const response = await proxy(req);

        // Should not get CSRF error (CSRF only checked for authenticated requests)
        expect(response.status).toBe(200);
        expect(mocks.validateOrigin).not.toHaveBeenCalled();
    });

    it('skips CSRF for non-API routes', async () => {
        mocks.validateOrigin.mockReturnValue(false);
        const req = buildAuthedRequest('GET', '/admin/dashboard');
        const response = await proxy(req);

        expect(response.status).toBe(200);
        expect(mocks.validateOrigin).not.toHaveBeenCalled();
    });
});

describe('Proxy: WhatsApp admin tab redirect', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.validateOrigin.mockReturnValue(true);
    });

    it('redirects /admin/whatsapp?tab=X to /admin/whatsapp/X', async () => {
        mocks.normalizeWhatsAppAdminTab.mockReturnValue('broadcast');
        const req = buildRequest('GET', '/admin/whatsapp?tab=broadcast');
        const response = await proxy(req);

        expect(response.status).toBe(307);
        const location = response.headers.get('location');
        expect(location).toContain('/admin/whatsapp/broadcast');
    });

    it('does not redirect /admin/whatsapp without tab param', async () => {
        const req = buildRequest('GET', '/admin/whatsapp');
        const response = await proxy(req);

        expect(response.status).toBe(200);
    });
});

describe('Proxy: Auth gating (via authConfig.authorized)', () => {
    // Auth gating is handled by the authorized callback in auth.config.ts.
    // Those checks are tested in src/lib/auth/roles.test.ts (canAccessAdminApi,
    // canAccessAdminPage, canAccessWhatsAppApi, isPublicWhatsAppRoute).
    // Here we just verify the proxy passes through for normal cases.

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.validateOrigin.mockReturnValue(true);
    });

    it('passes through authenticated admin requests', async () => {
        const req = buildAuthedRequest('GET', '/api/admin/pacientes');
        const response = await proxy(req);

        expect(response.status).toBe(200);
    });

    it('passes through public routes', async () => {
        const req = buildRequest('GET', '/');
        const response = await proxy(req);

        expect(response.status).toBe(200);
    });
});
