import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from './rate-limit';

type RouteHandler = (request: NextRequest, context?: any) => Promise<NextResponse>;

export interface RateLimitOptions {
    max: number;
    windowSec: number;
}

export function withRateLimit(handler: RouteHandler, opts: RateLimitOptions): RouteHandler {
    return async (request: NextRequest, context?: any) => {
        const ip = getClientIp(request);
        const key = `${ip}:${request.nextUrl.pathname}`;
        const result = checkRateLimit(key, opts.max, opts.windowSec * 1000);

        if (!result.allowed) {
            const retryAfterSec = Math.ceil(result.retryAfterMs / 1000);
            return NextResponse.json(
                {
                    success: false,
                    error: { code: 'RATE_LIMITED', message: 'Muitas requisições. Tente novamente em breve.' },
                },
                {
                    status: 429,
                    headers: { 'Retry-After': String(retryAfterSec) },
                }
            );
        }

        return handler(request, context);
    };
}
