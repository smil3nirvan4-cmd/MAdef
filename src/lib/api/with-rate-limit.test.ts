import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { __resetRateLimitStore } from '@/lib/api/rate-limit';

vi.mock('@/lib/observability/request-context', () => ({
    RequestContext: { getRequestId: () => 'test-id', getDurationMs: () => 0 },
}));

import { withRateLimit } from './with-rate-limit';

function makeRequest(path = '/api/test', ip = '1.2.3.4'): NextRequest {
    return new NextRequest(new URL(path, 'http://localhost'), {
        headers: { 'x-forwarded-for': ip },
    });
}

describe('withRateLimit', () => {
    beforeEach(() => {
        __resetRateLimitStore();
    });

    it('allows request within limit and calls handler', async () => {
        const handler = vi.fn().mockResolvedValue(
            NextResponse.json({ ok: true }, { status: 200 }),
        );
        const wrapped = withRateLimit(handler, { max: 5, windowSec: 60 });

        const response = await wrapped(makeRequest());

        expect(response.status).toBe(200);
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('returns 429 with Retry-After header when limit is exceeded', async () => {
        const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
        const wrapped = withRateLimit(handler, { max: 1, windowSec: 60 });

        // First request — allowed
        const first = await wrapped(makeRequest());
        expect(first.status).toBe(200);

        // Second request — blocked
        const second = await wrapped(makeRequest());
        expect(second.status).toBe(429);

        const body = await second.json();
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('RATE_LIMITED');

        const retryAfter = second.headers.get('Retry-After');
        expect(retryAfter).toBeDefined();
        expect(Number(retryAfter)).toBeGreaterThan(0);
    });

    it('allows requests again after the window expires', async () => {
        const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
        const wrapped = withRateLimit(handler, { max: 1, windowSec: 1 });

        // First request — allowed
        await wrapped(makeRequest());

        // Second request — blocked (within window)
        const blocked = await wrapped(makeRequest());
        expect(blocked.status).toBe(429);

        // Wait for window to expire
        await new Promise((resolve) => setTimeout(resolve, 1100));

        // Third request — allowed again
        const allowed = await wrapped(makeRequest());
        expect(allowed.status).toBe(200);
    });

    it('tracks limits per IP', async () => {
        const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
        const wrapped = withRateLimit(handler, { max: 1, windowSec: 60 });

        const firstIp = await wrapped(makeRequest('/api/test', '10.0.0.1'));
        expect(firstIp.status).toBe(200);

        const secondIp = await wrapped(makeRequest('/api/test', '10.0.0.2'));
        expect(secondIp.status).toBe(200);

        // Same IP again — blocked
        const blockedIp = await wrapped(makeRequest('/api/test', '10.0.0.1'));
        expect(blockedIp.status).toBe(429);
    });
});
