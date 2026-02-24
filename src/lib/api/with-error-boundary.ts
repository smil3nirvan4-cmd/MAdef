import { NextRequest, NextResponse } from 'next/server';
import { fail, serverError } from './response';
import { E } from './error-codes';
import logger from '@/lib/observability/logger';
import { metrics } from '@/lib/observability/metrics';
import { RequestContext } from '@/lib/observability/request-context';

type RouteHandler = (request: NextRequest, context?: any) => Promise<NextResponse>;

/**
 * Wraps an API route handler with a consistent error boundary.
 * Catches unhandled exceptions and returns structured error responses.
 * Also logs errors and tracks metrics for observability.
 */
export function withErrorBoundary(handler: RouteHandler): RouteHandler {
    return async (request: NextRequest, context?: any) => {
        const startMs = Date.now();
        const pathname = request?.nextUrl?.pathname ?? '/unknown';
        const method = request?.method ?? 'GET';
        const requestId = request?.headers?.get('x-request-id') ?? '';

        return RequestContext.run({ requestId, route: pathname }, async () => {
            try {
                const response = await handler(request, context);
                const durationMs = Date.now() - startMs;
                metrics.increment('http_requests_total', { method, status: String(response.status) });
                metrics.observe('http_request_duration_ms', durationMs);
                return response;
            } catch (error: unknown) {
                const durationMs = Date.now() - startMs;
                metrics.increment('http_requests_total', { method, status: '500' });
                metrics.increment('http_errors_total', { method, route: pathname });
                metrics.observe('http_request_duration_ms', durationMs);

                if (
                    error &&
                    typeof error === 'object' &&
                    'code' in error &&
                    (error as { code: string }).code === 'FORBIDDEN'
                ) {
                    const message = (error as { message?: string }).message || 'Forbidden';
                    return fail(E.FORBIDDEN, message, { status: 403 });
                }

                await logger.error(
                    'api_unhandled_error',
                    `Unhandled error in ${method} ${pathname}`,
                    error instanceof Error ? error : { rawError: String(error) },
                ).catch(() => {
                    // Swallow logging failures to avoid masking the original error
                });

                return serverError(error);
            }
        });
    };
}
