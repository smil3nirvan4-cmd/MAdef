import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import {
    AppError,
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError,
    DatabaseError,
} from '@/lib/errors';

vi.mock('@/lib/observability/logger', () => ({
    default: {
        error: vi.fn().mockResolvedValue(undefined),
        warning: vi.fn().mockResolvedValue(undefined),
        info: vi.fn().mockResolvedValue(undefined),
    },
}));

function buildRequest(method = 'GET', pathname = '/api/test'): NextRequest {
    return new NextRequest(`http://localhost:3000${pathname}`, { method });
}

describe('Error classes: properties', () => {
    it('AppError has code, statusCode, message, details', () => {
        const err = new AppError('CUSTOM', 422, 'custom message', { field: 'email' });
        expect(err.code).toBe('CUSTOM');
        expect(err.statusCode).toBe(422);
        expect(err.message).toBe('custom message');
        expect(err.details).toEqual({ field: 'email' });
        expect(err).toBeInstanceOf(Error);
    });

    it('ValidationError returns 400', () => {
        const err = new ValidationError('campo invalido');
        expect(err.statusCode).toBe(400);
        expect(err.code).toBe('VALIDATION_ERROR');
    });

    it('NotFoundError returns 404 with resource info', () => {
        const err = new NotFoundError('Paciente', 'abc123');
        expect(err.statusCode).toBe(404);
        expect(err.code).toBe('NOT_FOUND');
        expect(err.message).toContain('Paciente');
        expect(err.message).toContain('abc123');
    });

    it('NotFoundError works without id', () => {
        const err = new NotFoundError('Orcamento');
        expect(err.message).toContain('Orcamento');
    });

    it('UnauthorizedError returns 401', () => {
        const err = new UnauthorizedError();
        expect(err.statusCode).toBe(401);
    });

    it('ForbiddenError returns 403', () => {
        const err = new ForbiddenError();
        expect(err.statusCode).toBe(403);
    });

    it('ConflictError returns 409', () => {
        const err = new ConflictError('recurso ja existe');
        expect(err.statusCode).toBe(409);
    });

    it('DatabaseError returns 503', () => {
        const err = new DatabaseError('conexao perdida');
        expect(err.statusCode).toBe(503);
    });
});

describe('Error boundary: AppError integration', () => {
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

    it('converts ValidationError to 400', async () => {
        const handler = vi.fn().mockRejectedValue(new ValidationError('dados invalidos'));
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

        expect(response.status).toBe(403);
    });

    it('converts UnauthorizedError to 401', async () => {
        const handler = vi.fn().mockRejectedValue(new UnauthorizedError());
        const wrapped = withErrorBoundary(handler);
        const response = await wrapped(buildRequest());

        expect(response.status).toBe(401);
    });

    it('converts ConflictError to 409', async () => {
        const handler = vi.fn().mockRejectedValue(new ConflictError('ja existe'));
        const wrapped = withErrorBoundary(handler);
        const response = await wrapped(buildRequest());

        expect(response.status).toBe(409);
    });

    it('converts generic Error to 500 without leaking stack', async () => {
        const handler = vi.fn().mockRejectedValue(new Error('internal details'));
        const wrapped = withErrorBoundary(handler);
        const response = await wrapped(buildRequest());
        const body = await response.json();

        expect(response.status).toBe(500);
        expect(body.success).toBe(false);
        // Should NOT contain the full stack trace
        expect(JSON.stringify(body)).not.toContain('at Object');
    });

    it('includes details from AppError in response', async () => {
        const handler = vi.fn().mockRejectedValue(
            new AppError('CUSTOM', 422, 'custom error', { field: 'email' }),
        );
        const wrapped = withErrorBoundary(handler);
        const response = await wrapped(buildRequest());
        const body = await response.json();

        expect(response.status).toBe(422);
        expect(body.error.details).toEqual({ field: 'email' });
    });

    it('passes through successful responses unchanged', async () => {
        const handler = vi.fn().mockResolvedValue(
            new Response(JSON.stringify({ success: true, data: 'ok' }), { status: 200 }),
        );
        const wrapped = withErrorBoundary(handler);
        const response = await wrapped(buildRequest());
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
    });
});
