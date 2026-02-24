import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenericCircuitBreaker } from '../circuit-breaker';

describe('GenericCircuitBreaker', () => {
    let cb: GenericCircuitBreaker;

    beforeEach(() => {
        cb = new GenericCircuitBreaker({
            name: 'test',
            threshold: 3,
            resetTimeMs: 1000,
            timeoutMs: 500,
        });
    });

    it('starts in closed state', () => {
        expect(cb.getState()).toBe('closed');
    });

    it('executes function successfully when closed', async () => {
        const result = await cb.execute(() => Promise.resolve(42));
        expect(result).toBe(42);
        expect(cb.getState()).toBe('closed');
    });

    it('opens after threshold failures', async () => {
        const fail = () => Promise.reject(new Error('fail'));

        for (let i = 0; i < 3; i++) {
            await expect(cb.execute(fail)).rejects.toThrow('fail');
        }

        expect(cb.getState()).toBe('open');
    });

    it('rejects without calling fn when open', async () => {
        const fail = () => Promise.reject(new Error('fail'));
        for (let i = 0; i < 3; i++) {
            await expect(cb.execute(fail)).rejects.toThrow('fail');
        }

        const fn = vi.fn().mockResolvedValue('ok');
        await expect(cb.execute(fn)).rejects.toThrow('Circuit test is OPEN');
        expect(fn).not.toHaveBeenCalled();
    });

    it('transitions to half-open after resetTime', async () => {
        const fail = () => Promise.reject(new Error('fail'));
        for (let i = 0; i < 3; i++) {
            await expect(cb.execute(fail)).rejects.toThrow('fail');
        }
        expect(cb.getState()).toBe('open');

        // Advance time past resetTimeMs
        vi.useFakeTimers();
        vi.advanceTimersByTime(1100);

        // Next call should try (half-open)
        const result = await cb.execute(() => Promise.resolve('recovered'));
        expect(result).toBe('recovered');
        vi.useRealTimers();
    });

    it('closes after 2 successes in half-open', async () => {
        const fail = () => Promise.reject(new Error('fail'));
        for (let i = 0; i < 3; i++) {
            await expect(cb.execute(fail)).rejects.toThrow('fail');
        }

        vi.useFakeTimers();
        vi.advanceTimersByTime(1100);

        await cb.execute(() => Promise.resolve('ok'));
        // After 1 success, still half-open internally (successCount=1)
        await cb.execute(() => Promise.resolve('ok'));
        // After 2 successes, should be closed
        expect(cb.getState()).toBe('closed');
        vi.useRealTimers();
    });

    it('re-opens on failure in half-open', async () => {
        const fail = () => Promise.reject(new Error('fail'));
        for (let i = 0; i < 3; i++) {
            await expect(cb.execute(fail)).rejects.toThrow('fail');
        }

        vi.useFakeTimers();
        vi.advanceTimersByTime(1100);

        // Fail in half-open
        await expect(cb.execute(fail)).rejects.toThrow('fail');
        // Should be open again (failureCount >= threshold)
        expect(cb.getState()).toBe('open');
        vi.useRealTimers();
    });

    it('handles timeout', async () => {
        const slow = () => new Promise<string>((resolve) => setTimeout(() => resolve('late'), 2000));

        vi.useFakeTimers();
        const promise = cb.execute(slow);
        vi.advanceTimersByTime(600);
        await expect(promise).rejects.toThrow('Timeout 500ms');
        vi.useRealTimers();
    });

    it('reset() returns to initial state', async () => {
        const fail = () => Promise.reject(new Error('fail'));
        for (let i = 0; i < 3; i++) {
            await expect(cb.execute(fail)).rejects.toThrow('fail');
        }
        expect(cb.getState()).toBe('open');

        cb.reset();
        expect(cb.getState()).toBe('closed');

        const result = await cb.execute(() => Promise.resolve('works'));
        expect(result).toBe('works');
    });

    it('uses default timeout of 10000ms when not specified', async () => {
        const cbNoTimeout = new GenericCircuitBreaker({
            name: 'no-timeout',
            threshold: 3,
            resetTimeMs: 1000,
        });

        const result = await cbNoTimeout.execute(() => Promise.resolve('fast'));
        expect(result).toBe('fast');
    });
});
