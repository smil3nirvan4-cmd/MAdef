import { afterEach, describe, expect, it } from 'vitest';
import { __resetRateLimitStore, checkRateLimit, getClientIp, resolveRateLimitConfig } from './rate-limit';

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

    it('remaining decrementa corretamente', () => {
        const r1 = checkRateLimit('k2', 5, 60_000, 1000);
        expect(r1.remaining).toBe(4);
        const r2 = checkRateLimit('k2', 5, 60_000, 1001);
        expect(r2.remaining).toBe(3);
        const r3 = checkRateLimit('k2', 5, 60_000, 1002);
        expect(r3.remaining).toBe(2);
    });

    it('__resetRateLimitStore limpa tudo', () => {
        checkRateLimit('k1', 1, 60_000, 1000);
        __resetRateLimitStore();
        const fresh = checkRateLimit('k1', 1, 60_000, 1002);
        expect(fresh.allowed).toBe(true);
    });

    it('isola chaves diferentes', () => {
        checkRateLimit('a', 1, 60_000, 1000);
        const blocked = checkRateLimit('a', 1, 60_000, 1001);
        const allowed = checkRateLimit('b', 1, 60_000, 1001);

        expect(blocked.allowed).toBe(false);
        expect(allowed.allowed).toBe(true);
    });

    it('resolve ip a partir de headers', () => {
        const req = new Request('https://example.com', {
            headers: { 'x-forwarded-for': '200.1.2.3, 10.0.0.1' },
        });

        expect(getClientIp(req)).toBe('200.1.2.3');
    });

    it('resolve ip via x-real-ip fallback', () => {
        const req = new Request('https://example.com', {
            headers: { 'x-real-ip': '192.168.1.1' },
        });
        expect(getClientIp(req)).toBe('192.168.1.1');
    });

    it('retorna unknown quando nenhum header presente', () => {
        const req = new Request('https://example.com');
        expect(getClientIp(req)).toBe('unknown');
    });
});

describe('resolveRateLimitConfig', () => {
    it('auth routes get 10/min limit', () => {
        const config = resolveRateLimitConfig('/api/auth/login', 'POST');
        expect(config.maxRequests).toBe(10);
        expect(config.windowMs).toBe(60_000);
    });

    it('whatsapp routes get 60/min limit', () => {
        const config = resolveRateLimitConfig('/api/whatsapp/webhook', 'POST');
        expect(config.maxRequests).toBe(60);
    });

    it('admin POST gets 30/min limit', () => {
        const config = resolveRateLimitConfig('/api/admin/pacientes', 'POST');
        expect(config.maxRequests).toBe(30);
    });

    it('admin PUT gets 30/min limit', () => {
        const config = resolveRateLimitConfig('/api/admin/pacientes/123', 'PUT');
        expect(config.maxRequests).toBe(30);
    });

    it('admin DELETE gets 30/min limit', () => {
        const config = resolveRateLimitConfig('/api/admin/pacientes/123', 'DELETE');
        expect(config.maxRequests).toBe(30);
    });

    it('admin GET gets 100/min limit', () => {
        const config = resolveRateLimitConfig('/api/admin/pacientes', 'GET');
        expect(config.maxRequests).toBe(100);
    });
});
