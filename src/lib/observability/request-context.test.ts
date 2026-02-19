import { describe, expect, it } from 'vitest';
import { RequestContext } from './request-context';

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('RequestContext', () => {
    it('exposes context inside run()', async () => {
        await RequestContext.run({ requestId: 'req-1', route: '/api/test' }, async () => {
            expect(RequestContext.get()?.requestId).toBe('req-1');
            expect(RequestContext.get()?.route).toBe('/api/test');
            expect(RequestContext.getRequestId()).toBe('req-1');
        });
    });

    it('isolates nested contexts', async () => {
        await RequestContext.run({ requestId: 'outer', route: '/outer' }, async () => {
            expect(RequestContext.getRequestId()).toBe('outer');

            await RequestContext.run({ requestId: 'inner', route: '/inner' }, async () => {
                expect(RequestContext.getRequestId()).toBe('inner');
            });

            expect(RequestContext.getRequestId()).toBe('outer');
        });
    });

    it('returns empty id outside context', () => {
        expect(RequestContext.get()).toBeNull();
        expect(RequestContext.getRequestId()).toBe('');
    });

    it('returns non-negative duration', async () => {
        await RequestContext.run({ requestId: 'timed' }, async () => {
            await wait(10);
            expect(RequestContext.getDurationMs()).toBeGreaterThanOrEqual(0);
        });
    });

    it('keeps contexts independent in parallel flows', async () => {
        const [a, b] = await Promise.all([
            RequestContext.run({ requestId: 'parallel-a' }, async () => {
                await wait(5);
                return RequestContext.getRequestId();
            }),
            RequestContext.run({ requestId: 'parallel-b' }, async () => {
                await wait(1);
                return RequestContext.getRequestId();
            }),
        ]);

        expect(new Set([a, b])).toEqual(new Set(['parallel-a', 'parallel-b']));
    });
});
