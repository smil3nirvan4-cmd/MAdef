import { NextRequest } from 'next/server';
import { z, ZodError } from 'zod';
import { fail, E } from './response';

/**
 * Parse and validate request body with a Zod schema.
 * Returns the validated data or a structured error response.
 */
export async function parseBody<T extends z.ZodTypeAny>(
    request: NextRequest | Request,
    schema: T,
): Promise<{ data: z.infer<T>; error?: never } | { data?: never; error: ReturnType<typeof fail> }> {
    let raw: unknown;
    try {
        raw = await request.json();
    } catch {
        return { error: fail(E.VALIDATION_ERROR, 'Invalid JSON body', { status: 400 }) };
    }

    try {
        const data = schema.parse(raw);
        return { data };
    } catch (err) {
        if (err instanceof ZodError) {
            return {
                error: fail(E.VALIDATION_ERROR, 'Validation failed', {
                    status: 400,
                    details: err.issues.map((issue) => ({
                        path: issue.path.join('.'),
                        message: issue.message,
                    })),
                }),
            };
        }
        return { error: fail(E.VALIDATION_ERROR, 'Unexpected validation error', { status: 400 }) };
    }
}

/**
 * Parse and validate query parameters with a Zod schema.
 */
export function parseQuery<T extends z.ZodTypeAny>(
    request: NextRequest | Request,
    schema: T,
): { data: z.infer<T>; error?: never } | { data?: never; error: ReturnType<typeof fail> } {
    const url = new URL(request.url);
    const params: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
        params[key] = value;
    });

    try {
        const data = schema.parse(params);
        return { data };
    } catch (err) {
        if (err instanceof ZodError) {
            return {
                error: fail(E.VALIDATION_ERROR, 'Invalid query parameters', {
                    status: 400,
                    details: err.issues.map((issue) => ({
                        path: issue.path.join('.'),
                        message: issue.message,
                    })),
                }),
            };
        }
        return { error: fail(E.VALIDATION_ERROR, 'Unexpected validation error', { status: 400 }) };
    }
}
