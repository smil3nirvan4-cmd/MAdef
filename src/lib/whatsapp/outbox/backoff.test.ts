import { describe, expect, it } from 'vitest';
import { calculateRetryBackoffMs, calculateRetryDate } from '@/lib/whatsapp/outbox/backoff';

describe('outbox backoff', () => {
    it('calculates exponential delays', () => {
        expect(calculateRetryBackoffMs(1)).toBe(30_000);
        expect(calculateRetryBackoffMs(2)).toBe(60_000);
        expect(calculateRetryBackoffMs(3)).toBe(120_000);
    });

    it('caps delay by max value', () => {
        expect(calculateRetryBackoffMs(10, 30_000, 180_000)).toBe(180_000);
    });

    it('returns next retry date from now', () => {
        const base = new Date('2026-02-17T10:00:00.000Z');
        const next = calculateRetryDate(2, base, 1000, 10_000);
        expect(next.toISOString()).toBe('2026-02-17T10:00:02.000Z');
    });
});

