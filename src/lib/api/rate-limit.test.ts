import { afterEach, describe, expect, it } from 'vitest';
import { __resetRateLimitStore, checkRateLimit, getClientIp } from './rate-limit';

afterEach(() => {
    __resetRateLimitStore();
});

describe('rate-limit', () => {
    it('permite requisicoes ate o limite', () => {
        const first = checkRateLimit('k1', 2, 60_000, 1000);
        const second = checkRateLimit('k1', 2, 60_000, 1001);

        expect(first.allowed).toBe(true);
        expect(second.allowed).toBe(true);
        expect(second.remaining).toBe(0);
    });

    it('bloqueia quando excede o limite', () => {
        checkRateLimit('k1', 1, 60_000, 1000);
        const blocked = checkRateLimit('k1', 1, 60_000, 1002);

        expect(blocked.allowed).toBe(false);
        expect(blocked.retryAfterMs).toBeGreaterThan(0);
    });

    it('reseta apos janela', () => {
        checkRateLimit('k1', 1, 1000, 1000);
        const afterWindow = checkRateLimit('k1', 1, 1000, 2500);

        expect(afterWindow.allowed).toBe(true);
        expect(afterWindow.remaining).toBe(0);
    });

    it('resolve ip a partir de headers', () => {
        const req = new Request('https://example.com', {
            headers: { 'x-forwarded-for': '200.1.2.3, 10.0.0.1' },
        });

        expect(getClientIp(req)).toBe('200.1.2.3');
    });
});
