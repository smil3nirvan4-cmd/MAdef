import { NextRequest, NextResponse } from 'next/server';
import { fail, serverError } from './response';
import { E } from './error-codes';
import { AppError } from '@/lib/errors';
import logger from '@/lib/observability/logger';

type RouteContext = { params: Promise<Record<string, string | string[] | undefined>> };
type RouteHandler = (request: NextRequest, context?: any) => Promise<NextResponse>;

/**
 * Wraps an API route handler with a consistent error boundary.
 * Catches unhandled exceptions and returns structured error responses.
 * Recognizes AppError subclasses for domain-specific status codes.
 * Also logs errors to the system log for observability.
 */
export function withErrorBoundary(handler: RouteHandler): RouteHandler {
    return async (request: NextRequest, context?: RouteContext) => {
        try {
            return await handler(request, context);
        } catch (error: unknown) {
            const pathname = request.nextUrl?.pathname || new URL(request.url).pathname;
            const method = request.method;

            // Handle AppError: return structured response with proper status code
            if (error instanceof AppError) {
                await logger.warning(
                    'api_app_error',
                    `${error.name} in ${method} ${pathname}: ${error.message}`,
                    { code: error.code, statusCode: error.statusCode, details: error.details },
                ).catch(() => {});
                return fail(error.code, error.message, {
                    status: error.statusCode,
                    details: error.details,
                });
            }

            // Legacy: handle plain objects with code === 'FORBIDDEN'
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
