import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from './rate-limit';
import { fail } from './response';
import { E } from './error-codes';

type RouteContext = { params: Promise<Record<string, string>> };
type RouteHandler = (request: NextRequest, context?: RouteContext) => Promise<NextResponse>;

interface RateLimitOptions {
    /** Maximum requests allowed in the window */
    max: number;
    /** Window duration in milliseconds */
    windowMs: number;
    /** Optional key prefix (defaults to route pathname) */
    prefix?: string;
}

/**
 * Wraps an API route handler with rate limiting.
 * Returns 429 if the client exceeds the allowed request rate.
 */
export function withRateLimit(handler: RouteHandler, options: RateLimitOptions): RouteHandler {
    return async (request: NextRequest, context?: RouteContext) => {
        const ip = getClientIp(request);
        const prefix = options.prefix || request.nextUrl.pathname;
        const key = `${prefix}:${ip}`;

        const result = checkRateLimit(key, options.max, options.windowMs);
        if (!result.allowed) {
            return fail(E.RATE_LIMITED, 'Rate limit exceeded. Try again later.', {
                status: 429,
                details: { retryAfterMs: result.retryAfterMs },
            });
        }

        const response = await handler(request, context);
        response.headers.set('X-RateLimit-Remaining', String(result.remaining));
        return response;
    };
}
