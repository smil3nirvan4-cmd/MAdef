import { describe, expect, it } from 'vitest';
import { generateCsrfToken, validateCsrf, validateOrigin } from './csrf';
import { NextRequest } from 'next/server';

function buildRequest(
    method: string,
    pathname: string,
    headers?: Record<string, string>,
    cookies?: Record<string, string>,
): NextRequest {
    const url = `http://localhost:3000${pathname}`;
    const req = new NextRequest(url, { method, headers });
    if (cookies) {
        for (const [name, value] of Object.entries(cookies)) {
            req.cookies.set(name, value);
        }
    }
    return req;
}

describe('CSRF: generateCsrfToken', () => {
    it('generates a 64-char hex token', () => {
        const token = generateCsrfToken();
        expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('generates unique tokens', () => {
        const a = generateCsrfToken();
        const b = generateCsrfToken();
        expect(a).not.toBe(b);
    });
});

describe('CSRF: validateCsrf (double-submit cookie)', () => {
    it('allows GET requests without tokens', () => {
        const req = buildRequest('GET', '/api/admin/pacientes');
        expect(validateCsrf(req)).toBe(true);
    });

    it('allows HEAD requests', () => {
        const req = buildRequest('HEAD', '/api/admin/pacientes');
        expect(validateCsrf(req)).toBe(true);
    });

    it('allows OPTIONS requests', () => {
        const req = buildRequest('OPTIONS', '/api/admin/pacientes');
        expect(validateCsrf(req)).toBe(true);
    });

    it('exempts webhook routes', () => {
        const req = buildRequest('POST', '/api/whatsapp/webhook');
        expect(validateCsrf(req)).toBe(true);
    });

    it('exempts auth routes', () => {
        const req = buildRequest('POST', '/api/auth/callback/credentials');
        expect(validateCsrf(req)).toBe(true);
    });

    it('rejects POST without cookie', () => {
        const req = buildRequest('POST', '/api/admin/pacientes', {
            'x-csrf-token': 'abc123',
        });
        expect(validateCsrf(req)).toBe(false);
    });

    it('rejects POST without header', () => {
        const req = buildRequest('POST', '/api/admin/pacientes', {}, {
            'csrf-token': 'abc123',
        });
        expect(validateCsrf(req)).toBe(false);
    });

    it('rejects mismatched tokens', () => {
        const req = buildRequest('POST', '/api/admin/pacientes', {
            'x-csrf-token': 'token-a-0000000000000000000000000000000',
        }, {
            'csrf-token': 'token-b-0000000000000000000000000000000',
        });
        expect(validateCsrf(req)).toBe(false);
    });

    it('accepts matching tokens', () => {
        const token = generateCsrfToken();
        const req = buildRequest('POST', '/api/admin/pacientes', {
            'x-csrf-token': token,
        }, {
            'csrf-token': token,
        });
        expect(validateCsrf(req)).toBe(true);
    });
});

describe('CSRF: validateOrigin', () => {
    it('allows GET requests regardless of origin', () => {
        const req = buildRequest('GET', '/api/admin/pacientes', {
            origin: 'http://evil.com',
            host: 'localhost:3000',
        });
        expect(validateOrigin(req)).toBe(true);
    });

    it('allows POST without origin header (server-to-server)', () => {
        const req = buildRequest('POST', '/api/admin/pacientes', {
            host: 'localhost:3000',
        });
        expect(validateOrigin(req)).toBe(true);
    });

    it('allows same-origin POST', () => {
        const req = buildRequest('POST', '/api/admin/pacientes', {
            origin: 'http://localhost:3000',
            host: 'localhost:3000',
        });
        expect(validateOrigin(req)).toBe(true);
    });

    it('rejects cross-origin POST', () => {
        const req = buildRequest('POST', '/api/admin/pacientes', {
            origin: 'http://evil.com',
            host: 'localhost:3000',
        });
        expect(validateOrigin(req)).toBe(false);
    });

    it('rejects malformed origin', () => {
        const req = buildRequest('POST', '/api/admin/pacientes', {
            origin: 'not-a-url',
            host: 'localhost:3000',
        });
        expect(validateOrigin(req)).toBe(false);
    });

    it('exempts webhook routes from origin check', () => {
        const req = buildRequest('POST', '/api/whatsapp/webhook', {
            origin: 'http://evil.com',
            host: 'localhost:3000',
        });
        expect(validateOrigin(req)).toBe(true);
    });

    it('exempts auth routes from origin check', () => {
        const req = buildRequest('POST', '/api/auth/callback/credentials', {
            origin: 'http://evil.com',
            host: 'localhost:3000',
        });
        expect(validateOrigin(req)).toBe(true);
    });
});
