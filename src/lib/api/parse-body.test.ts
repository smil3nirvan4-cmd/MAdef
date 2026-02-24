import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { z } from 'zod';

vi.mock('@/lib/observability/request-context', () => ({
    RequestContext: { getRequestId: () => 'test-id', getDurationMs: () => 0 },
}));

import { parseBody, isFailResponse } from './parse-body';

const schema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive(),
});

function makeRequest(body: unknown): NextRequest {
    return new NextRequest(new URL('http://localhost/api/test'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

function makeInvalidJsonRequest(): NextRequest {
    return new NextRequest(new URL('http://localhost/api/test'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json {{{',
    });
}

describe('parseBody', () => {
    it('returns parsed data for valid body', async () => {
        const req = makeRequest({ name: 'Alice', age: 30 });
        const result = await parseBody(req, schema);

        expect(isFailResponse(result)).toBe(false);
        expect(result).toEqual({ name: 'Alice', age: 30 });
    });

    it('returns fail response for missing required field', async () => {
        const req = makeRequest({ name: 'Alice' });
        const result = await parseBody(req, schema);

        expect(isFailResponse(result)).toBe(true);
        const response = result as Response;
        expect(response.status).toBe(400);

        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns fail response for invalid field type', async () => {
        const req = makeRequest({ name: 'Alice', age: 'not-a-number' });
        const result = await parseBody(req, schema);

        expect(isFailResponse(result)).toBe(true);
        const response = result as Response;
        expect(response.status).toBe(400);

        const body = await response.json();
        expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns fail response for invalid JSON', async () => {
        const req = makeInvalidJsonRequest();
        const result = await parseBody(req, schema);

        expect(isFailResponse(result)).toBe(true);
        const response = result as Response;
        expect(response.status).toBe(400);

        const body = await response.json();
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('VALIDATION_ERROR');
        expect(body.error.message).toContain('inválido');
    });

    it('includes field path in validation error details', async () => {
        const req = makeRequest({ name: '', age: 30 });
        const result = await parseBody(req, schema);

        expect(isFailResponse(result)).toBe(true);
        const body = await (result as Response).json();
        expect(body.error.details).toBeDefined();
        expect(body.error.details).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ path: 'name' }),
            ]),
        );
    });
});

describe('isFailResponse', () => {
    it('returns true for a Response object', () => {
        const response = new Response('test', { status: 400 });
        expect(isFailResponse(response)).toBe(true);
    });

    it('returns false for plain data', () => {
        expect(isFailResponse({ name: 'Alice', age: 30 })).toBe(false);
    });

    it('returns false for null', () => {
        expect(isFailResponse(null)).toBe(false);
    });

    it('returns false for undefined', () => {
        expect(isFailResponse(undefined)).toBe(false);
    });
});
