import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { __resetRateLimitStore, checkRateLimit, getClientIp } from '@/lib/api/rate-limit';

afterEach(() => {
    __resetRateLimitStore();
});

describe('Rate limiting: core behavior', () => {
    it('allows requests within the limit', () => {
        const now = 1000;
        const r1 = checkRateLimit('test-key', 3, 60_000, now);
        const r2 = checkRateLimit('test-key', 3, 60_000, now + 1);
        const r3 = checkRateLimit('test-key', 3, 60_000, now + 2);

        expect(r1.allowed).toBe(true);
        expect(r2.allowed).toBe(true);
        expect(r3.allowed).toBe(true);
        expect(r3.remaining).toBe(0);
    });

    it('blocks request N+1 with retryAfterMs', () => {
        const now = 1000;
        checkRateLimit('test-key', 2, 60_000, now);
        checkRateLimit('test-key', 2, 60_000, now + 1);
        const blocked = checkRateLimit('test-key', 2, 60_000, now + 2);

        expect(blocked.allowed).toBe(false);
        expect(blocked.retryAfterMs).toBeGreaterThan(0);
    });

    it('allows requests again after window expires', () => {
        const now = 1000;
        checkRateLimit('test-key', 1, 60_000, now);
        const blocked = checkRateLimit('test-key', 1, 60_000, now + 1);
        expect(blocked.allowed).toBe(false);

        const afterWindow = checkRateLimit('test-key', 1, 60_000, now + 60_001);
        expect(afterWindow.allowed).toBe(true);
    });

    it('tracks different keys independently', () => {
        const now = 1000;
        checkRateLimit('key-a', 1, 60_000, now);
        const blockedA = checkRateLimit('key-a', 1, 60_000, now + 1);
        const allowedB = checkRateLimit('key-b', 1, 60_000, now + 1);

        expect(blockedA.allowed).toBe(false);
        expect(allowedB.allowed).toBe(true);
    });
});

describe('Rate limiting: IP extraction', () => {
    it('extracts IP from x-forwarded-for header', () => {
        const req = new NextRequest('http://localhost:3000/api/test', {
            headers: { 'x-forwarded-for': '192.168.1.100, 10.0.0.1' },
        });
        expect(getClientIp(req)).toBe('192.168.1.100');
    });

    it('extracts IP from x-real-ip header', () => {
        const req = new NextRequest('http://localhost:3000/api/test', {
            headers: { 'x-real-ip': '10.0.0.5' },
        });
        expect(getClientIp(req)).toBe('10.0.0.5');
    });

    it('returns "unknown" when no IP headers present', () => {
        const req = new NextRequest('http://localhost:3000/api/test');
        expect(getClientIp(req)).toBe('unknown');
    });
});

describe('Rate limiting: security scenarios', () => {
    it('prevents brute force with low limit on auth endpoint', () => {
        const now = 1000;
        // Simulate 5 attempts (typical auth rate limit)
        for (let i = 0; i < 5; i++) {
            checkRateLimit('auth:192.168.1.1', 5, 300_000, now + i);
        }
        const attempt6 = checkRateLimit('auth:192.168.1.1', 5, 300_000, now + 5);
        expect(attempt6.allowed).toBe(false);
        expect(attempt6.retryAfterMs).toBeGreaterThan(0);
    });

    it('limits broadcast endpoints more strictly', () => {
        const now = 1000;
        for (let i = 0; i < 3; i++) {
            checkRateLimit('broadcast:192.168.1.1', 3, 300_000, now + i);
        }
        const blocked = checkRateLimit('broadcast:192.168.1.1', 3, 300_000, now + 3);
        expect(blocked.allowed).toBe(false);
    });
});
