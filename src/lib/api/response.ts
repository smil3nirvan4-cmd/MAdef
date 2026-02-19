import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { RequestContext } from '@/lib/observability/request-context';
import type { ApiError, ApiMeta, ApiPaginatedSuccess, ApiPagination, ApiSuccess } from './types';
import { E } from './error-codes';

function buildMeta(): ApiMeta {
    return {
        requestId: RequestContext.getRequestId() || randomUUID(),
        durationMs: RequestContext.getDurationMs(),
        timestamp: new Date().toISOString(),
    };
}

function withRequestIdHeader<T>(response: NextResponse<T>, requestId: string): NextResponse<T> {
    response.headers.set('x-request-id', requestId);
    return response;
}

export function ok<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
    const meta = buildMeta();
    return withRequestIdHeader(
        NextResponse.json<ApiSuccess<T>>(
            {
                success: true,
                data,
                meta,
            },
            { status }
        ),
        meta.requestId
    );
}

export function paginated<T>(
    items: T[],
    pagination: Omit<ApiPagination, 'totalPages' | 'hasNext' | 'hasPrev'>,
    status = 200,
    extras?: Record<string, unknown>
): NextResponse<ApiPaginatedSuccess<T> & Record<string, unknown>> {
    const totalPages = pagination.pageSize > 0
        ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
        : 1;
    const normalized: ApiPagination = {
        ...pagination,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1,
    };

    const meta = buildMeta();
    return withRequestIdHeader(
        NextResponse.json<ApiPaginatedSuccess<T> & Record<string, unknown>>(
            {
                success: true,
                data: items,
                pagination: normalized,
                meta,
                ...(extras || {}),
            },
            { status }
        ),
        meta.requestId
    );
}

export function fail(
    code: string,
    message: string,
    options?: { status?: number; details?: unknown; field?: string }
): NextResponse<ApiError> {
    const meta = buildMeta();
    const response = NextResponse.json<ApiError>(
        {
            success: false,
            error: {
                code,
                message,
                ...(options?.details !== undefined ? { details: options.details } : {}),
                ...(options?.field ? { field: options.field } : {}),
            },
            meta,
        },
        { status: options?.status ?? 400 }
    );

    return withRequestIdHeader(response, meta.requestId);
}

export function serverError(error: unknown): NextResponse<ApiError> {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return fail(E.INTERNAL_ERROR, message, { status: 500 });
}

export { E };
