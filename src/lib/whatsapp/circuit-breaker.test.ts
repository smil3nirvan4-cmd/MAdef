import { describe, expect, it, vi } from 'vitest';
import { CircuitBreaker } from './circuit-breaker';

describe('CircuitBreaker', () => {
    it('starts CLOSED with no failures', () => {
        const breaker = new CircuitBreaker();
        expect(breaker.getState()).toBe('CLOSED');
        expect(breaker.getFailureCount()).toBe(0);
    });

    it('remains CLOSED below threshold', () => {
        const breaker = new CircuitBreaker({ failureThreshold: 5 });
        for (let i = 0; i < 4; i += 1) {
            breaker.recordFailure(500);
        }
        expect(breaker.getState()).toBe('CLOSED');
    });

    it('opens when threshold is reached', () => {
        const breaker = new CircuitBreaker({ failureThreshold: 5 });
        for (let i = 0; i < 5; i += 1) {
            breaker.recordFailure(500);
        }
        expect(breaker.getState()).toBe('OPEN');
        expect(breaker.isOpen()).toBe(true);
    });

    it('transitions to HALF_OPEN after open duration', () => {
        vi.useFakeTimers();
        const breaker = new CircuitBreaker({ failureThreshold: 1, openDurationMs: 1000 });
        breaker.recordFailure(500);
        expect(breaker.getState()).toBe('OPEN');

        vi.advanceTimersByTime(1001);
        expect(breaker.getState()).toBe('HALF_OPEN');
        vi.useRealTimers();
    });

    it('closes after success in HALF_OPEN', () => {
        vi.useFakeTimers();
        const breaker = new CircuitBreaker({ failureThreshold: 1, openDurationMs: 1000, successThreshold: 1 });
        breaker.recordFailure(500);
        vi.advanceTimersByTime(1001);
        expect(breaker.getState()).toBe('HALF_OPEN');

        breaker.recordSuccess();
        expect(breaker.getState()).toBe('CLOSED');
        vi.useRealTimers();
    });

    it('re-opens after failure in HALF_OPEN', () => {
        vi.useFakeTimers();
        const breaker = new CircuitBreaker({ failureThreshold: 1, openDurationMs: 1000 });
        breaker.recordFailure(500);
        vi.advanceTimersByTime(1001);
        expect(breaker.getState()).toBe('HALF_OPEN');

        breaker.recordFailure(500);
        expect(breaker.getState()).toBe('OPEN');
        vi.useRealTimers();
    });

    it('recordSuccess in CLOSED does not change state', () => {
        const breaker = new CircuitBreaker();
        breaker.recordSuccess();
        expect(breaker.getState()).toBe('CLOSED');
    });
});
