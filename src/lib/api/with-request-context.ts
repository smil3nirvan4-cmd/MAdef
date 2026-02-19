import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { RequestContext } from '@/lib/observability/request-context';

export function withRequestContext<T extends (...args: any[]) => Promise<NextResponse<any>>>(handler: T): T {
    return (async (...args: any[]) => {
        const request = args[0] as NextRequest;
        const requestId = String(request?.headers?.get('x-request-id') || '').trim() || randomUUID();
        const route = request?.nextUrl?.pathname || '';

        const response = await RequestContext.run(
            { requestId, route },
            () => handler(...args)
        );

        response.headers.set('x-request-id', requestId);
        return response;
    }) as T;
}
