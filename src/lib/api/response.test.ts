import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/observability/request-context', () => ({
    RequestContext: { getRequestId: () => 'test-id', getDurationMs: () => 0 },
}));

import { ok, fail, serverError, paginated, E } from './response';

describe('ok', () => {
    it('returns status 200 with success body by default', async () => {
        const response = ok({ foo: 'bar' });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.data).toEqual({ foo: 'bar' });
        expect(body.meta).toBeDefined();
        expect(body.meta.requestId).toBe('test-id');
        expect(body.meta.timestamp).toBeDefined();
    });

    it('returns custom status code when provided', async () => {
        const response = ok({ id: '1' }, 201);

        expect(response.status).toBe(201);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.data).toEqual({ id: '1' });
    });

    it('sets x-request-id header', () => {
        const response = ok('data');
        expect(response.headers.get('x-request-id')).toBe('test-id');
    });
});

describe('fail', () => {
    it('returns status 400 with error body by default', async () => {
        const response = fail(E.VALIDATION_ERROR, 'Invalid input');

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('VALIDATION_ERROR');
        expect(body.error.message).toBe('Invalid input');
        expect(body.meta).toBeDefined();
    });

    it('returns custom status code when provided', async () => {
        const response = fail(E.NOT_FOUND, 'Not found', { status: 404 });

        expect(response.status).toBe(404);
        const body = await response.json();
        expect(body.error.code).toBe('NOT_FOUND');
        expect(body.error.message).toBe('Not found');
    });

    it('includes details when provided', async () => {
        const details = [{ path: 'name', message: 'required' }];
        const response = fail(E.VALIDATION_ERROR, 'Bad', { details });

        const body = await response.json();
        expect(body.error.details).toEqual(details);
    });

    it('includes field when provided', async () => {
        const response = fail(E.MISSING_FIELD, 'Missing', { field: 'email' });

        const body = await response.json();
        expect(body.error.field).toBe('email');
    });

    it('sets x-request-id header', () => {
        const response = fail(E.VALIDATION_ERROR, 'err');
        expect(response.headers.get('x-request-id')).toBe('test-id');
    });
});

describe('serverError', () => {
    it('returns status 500 with INTERNAL_ERROR code for Error instances', async () => {
        const response = serverError(new Error('something broke'));

        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('INTERNAL_ERROR');
        expect(body.error.message).toBe('something broke');
    });

    it('returns generic message for non-Error values', async () => {
        const response = serverError('random string');

        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.error.code).toBe('INTERNAL_ERROR');
        expect(body.error.message).toBe('Internal server error');
    });
});

describe('paginated', () => {
    it('returns paginated response with correct metadata', async () => {
        const items = [{ id: 1 }, { id: 2 }];
        const response = paginated(items, { page: 1, pageSize: 10, total: 25 });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.data).toEqual(items);
        expect(body.pagination).toEqual({
            page: 1,
            pageSize: 10,
            total: 25,
            totalPages: 3,
            hasNext: true,
            hasPrev: false,
        });
    });

    it('calculates totalPages correctly', async () => {
        const response = paginated([], { page: 1, pageSize: 5, total: 12 });
        const body = await response.json();

        expect(body.pagination.totalPages).toBe(3);
    });

    it('sets hasNext false on last page', async () => {
        const response = paginated([], { page: 3, pageSize: 5, total: 12 });
        const body = await response.json();

        expect(body.pagination.hasNext).toBe(false);
        expect(body.pagination.hasPrev).toBe(true);
    });

    it('sets hasPrev false on first page', async () => {
        const response = paginated([], { page: 1, pageSize: 10, total: 5 });
        const body = await response.json();

        expect(body.pagination.hasPrev).toBe(false);
    });

    it('handles pageSize of 0 gracefully', async () => {
        const response = paginated([], { page: 1, pageSize: 0, total: 10 });
        const body = await response.json();

        expect(body.pagination.totalPages).toBe(1);
    });

    it('includes extras when provided', async () => {
        const response = paginated([{ id: 1 }], { page: 1, pageSize: 10, total: 1 }, 200, {
            summary: { total: 100 },
        });
        const body = await response.json();

        expect(body.summary).toEqual({ total: 100 });
    });

    it('sets x-request-id header', () => {
        const response = paginated([], { page: 1, pageSize: 10, total: 0 });
        expect(response.headers.get('x-request-id')).toBe('test-id');
    });
});
