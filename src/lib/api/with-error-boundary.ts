import { NextRequest, NextResponse } from 'next/server';
import { fail, serverError } from './response';
import { E } from './error-codes';
import logger from '@/lib/observability/logger';

type RouteContext = { params: Promise<Record<string, string | string[] | undefined>> };
type RouteHandler = (request: NextRequest, context?: any) => Promise<NextResponse>;

/**
 * Wraps an API route handler with a consistent error boundary.
 * Catches unhandled exceptions and returns structured error responses.
 * Also logs errors to the system log for observability.
 */
export function withErrorBoundary(handler: RouteHandler): RouteHandler {
    return async (request: NextRequest, context?: RouteContext) => {
        try {
            return await handler(request, context);
        } catch (error: unknown) {
            const pathname = request.nextUrl.pathname;
            const method = request.method;

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
    };
}
