import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { withErrorBoundary } from './with-error-boundary';
import { AppError, NotFoundError, ConflictError, ValidationError, ForbiddenError } from '@/lib/errors';

vi.mock('@/lib/observability/logger', () => ({
    default: {
        error: vi.fn().mockResolvedValue(undefined),
        warning: vi.fn().mockResolvedValue(undefined),
    },
}));

function buildRequest(method = 'GET', pathname = '/api/test'): NextRequest {
    return new NextRequest(`http://localhost:3000${pathname}`, { method });
}

describe('withErrorBoundary', () => {
    it('returns handler response when no error', async () => {
        const handler = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ ok: true }), { status: 200 })
        );
        const wrapped = withErrorBoundary(handler);
        const response = await wrapped(buildRequest());
        expect(response.status).toBe(200);
    });

    it('converts NotFoundError to 404 structured response', async () => {
        const handler = vi.fn().mockRejectedValue(new NotFoundError('Paciente', 'abc'));
        const wrapped = withErrorBoundary(handler);
        const response = await wrapped(buildRequest());
        const body = await response.json();

        expect(response.status).toBe(404);
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('NOT_FOUND');
        expect(body.error.message).toContain('Paciente');
    });

    it('converts ConflictError to 409', async () => {
        const handler = vi.fn().mockRejectedValue(new ConflictError('duplicate'));
        const wrapped = withErrorBoundary(handler);
        const response = await wrapped(buildRequest());
        const body = await response.json();

        expect(response.status).toBe(409);
        expect(body.error.code).toBe('CONFLICT');
    });

    it('converts ValidationError to 400', async () => {
        const handler = vi.fn().mockRejectedValue(new ValidationError('bad field'));
        const wrapped = withErrorBoundary(handler);
        const response = await wrapped(buildRequest());
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('converts ForbiddenError to 403', async () => {
        const handler = vi.fn().mockRejectedValue(new ForbiddenError());
        const wrapped = withErrorBoundary(handler);
        const response = await wrapped(buildRequest());
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.error.code).toBe('FORBIDDEN');
    });

    it('includes details from AppError in response', async () => {
        const handler = vi.fn().mockRejectedValue(
            new AppError('CUSTOM', 422, 'custom error', { field: 'email' })
        );
        const wrapped = withErrorBoundary(handler);
        const response = await wrapped(buildRequest());
        const body = await response.json();

        expect(response.status).toBe(422);
        expect(body.error.details).toEqual({ field: 'email' });
    });

    it('handles legacy FORBIDDEN objects', async () => {
        const handler = vi.fn().mockRejectedValue({ code: 'FORBIDDEN', message: 'no access' });
        const wrapped = withErrorBoundary(handler);
        const response = await wrapped(buildRequest());
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body.error.code).toBe('FORBIDDEN');
    });

    it('converts unknown errors to 500', async () => {
        const handler = vi.fn().mockRejectedValue(new Error('unexpected'));
        const wrapped = withErrorBoundary(handler);
        const response = await wrapped(buildRequest());
        const body = await response.json();

        expect(response.status).toBe(500);
        expect(body.error.code).toBe('INTERNAL_ERROR');
    });

    it('handles non-Error throws as 500', async () => {
        const handler = vi.fn().mockRejectedValue('string error');
        const wrapped = withErrorBoundary(handler);
        const response = await wrapped(buildRequest());

        expect(response.status).toBe(500);
    });
});
