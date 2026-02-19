import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

export interface RequestContextValue {
    requestId: string;
    userId?: string;
    role?: string;
    route?: string;
    startedAt: number;
}

const store = new AsyncLocalStorage<RequestContextValue>();

export const RequestContext = {
    run<T>(ctx: Omit<RequestContextValue, 'startedAt'>, fn: () => T): T {
        const requestId = String(ctx.requestId || '').trim() || randomUUID();
        return store.run(
            {
                ...ctx,
                requestId,
                startedAt: Date.now(),
            },
            fn
        );
    },

    get(): RequestContextValue | null {
        return store.getStore() || null;
    },

    getRequestId(): string {
        return store.getStore()?.requestId || '';
    },

    getDurationMs(): number {
        const startedAt = store.getStore()?.startedAt;
        if (!startedAt) return 0;
        return Math.max(0, Date.now() - startedAt);
    },
};
