import { describe, expect, it, vi } from 'vitest';
import { BACKOFF_SCHEDULE_SECONDS, calculateNextScheduledAt, shouldDie } from '@/lib/whatsapp/outbox/backoff';

describe('outbox backoff', () => {
    it('uses deterministic exponential schedule', () => {
        const base = Date.UTC(2026, 1, 17, 10, 0, 0);
        expect(calculateNextScheduledAt(1, base).toISOString()).toBe('2026-02-17T10:00:05.000Z');
        expect(calculateNextScheduledAt(2, base).toISOString()).toBe('2026-02-17T10:00:30.000Z');
        expect(calculateNextScheduledAt(3, base).toISOString()).toBe('2026-02-17T10:02:00.000Z');
        expect(calculateNextScheduledAt(4, base).toISOString()).toBe('2026-02-17T10:10:00.000Z');
    });

    it('caps attempts above the schedule', () => {
        const base = Date.UTC(2026, 1, 17, 10, 0, 0);
        expect(calculateNextScheduledAt(5, base).toISOString()).toBe('2026-02-17T11:00:00.000Z');
        expect(calculateNextScheduledAt(6, base).toISOString()).toBe('2026-02-17T11:00:00.000Z');
        expect(BACKOFF_SCHEDULE_SECONDS[BACKOFF_SCHEDULE_SECONDS.length - 1]).toBe(3600);
    });

    it('dies when retries reaches max retries', () => {
        vi.stubEnv('WHATSAPP_MAX_RETRIES', '5');
        expect(shouldDie(4)).toBe(false);
        expect(shouldDie(5)).toBe(true);
        vi.unstubAllEnvs();
    });
});
