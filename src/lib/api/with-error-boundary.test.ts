import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

vi.mock('@/lib/observability/logger', () => ({
    default: { error: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@/lib/observability/request-context', () => ({
    RequestContext: { getRequestId: () => 'test-id', getDurationMs: () => 0 },
}));

import { withErrorBoundary } from './with-error-boundary';
import logger from '@/lib/observability/logger';

function makeRequest(path = '/api/test'): NextRequest {
    return new NextRequest(new URL(path, 'http://localhost'));
}

describe('withErrorBoundary', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns the handler response when handler succeeds', async () => {
        const handler = vi.fn().mockResolvedValue(
            NextResponse.json({ ok: true }, { status: 200 }),
        );
        const wrapped = withErrorBoundary(handler);

        const response = await wrapped(makeRequest());

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toEqual({ ok: true });
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('returns 500 serverError when handler throws a generic Error', async () => {
        const handler = vi.fn().mockRejectedValue(new Error('boom'));
        const wrapped = withErrorBoundary(handler);

        const response = await wrapped(makeRequest());

        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('INTERNAL_ERROR');
        expect(body.error.message).toBe('boom');
    });

    it('returns 403 when handler throws {code: "FORBIDDEN"}', async () => {
        const handler = vi.fn().mockRejectedValue({
            code: 'FORBIDDEN',
            message: 'No access',
        });
        const wrapped = withErrorBoundary(handler);

        const response = await wrapped(makeRequest());

        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('FORBIDDEN');
        expect(body.error.message).toBe('No access');
    });

    it('uses default "Forbidden" message when FORBIDDEN error has no message', async () => {
        const handler = vi.fn().mockRejectedValue({ code: 'FORBIDDEN' });
        const wrapped = withErrorBoundary(handler);

        const response = await wrapped(makeRequest());

        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.error.message).toBe('Forbidden');
    });

    it('calls logger.error on unhandled errors', async () => {
        const err = new Error('unexpected');
        const handler = vi.fn().mockRejectedValue(err);
        const wrapped = withErrorBoundary(handler);

        await wrapped(makeRequest('/api/things'));

        expect(logger.error).toHaveBeenCalledTimes(1);
        expect(logger.error).toHaveBeenCalledWith(
            'api_unhandled_error',
            expect.stringContaining('/api/things'),
            err,
        );
    });

    it('does not call logger.error for FORBIDDEN errors', async () => {
        const handler = vi.fn().mockRejectedValue({ code: 'FORBIDDEN', message: 'nope' });
        const wrapped = withErrorBoundary(handler);

        await wrapped(makeRequest());

        expect(logger.error).not.toHaveBeenCalled();
    });

    it('passes context through to the handler', async () => {
        const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
        const wrapped = withErrorBoundary(handler);
        const ctx = { params: { id: '123' } };

        await wrapped(makeRequest(), ctx);

        expect(handler).toHaveBeenCalledWith(expect.any(NextRequest), ctx);
    });
});
