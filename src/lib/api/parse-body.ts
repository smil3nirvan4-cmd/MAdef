import { NextRequest } from 'next/server';
import { z, ZodError } from 'zod';
import { E, fail } from './response';

/**
 * Parse and validate a JSON request body using a Zod schema.
 * Returns the parsed data or a fail() NextResponse.
 */
export async function parseBody<T extends z.ZodTypeAny>(
    request: NextRequest,
    schema: T,
): Promise<z.infer<T> | ReturnType<typeof fail>> {
    let raw: unknown;
    try {
        raw = await request.json();
    } catch {
        return fail(E.VALIDATION_ERROR, 'Corpo da requisição inválido ou ausente', { status: 400 });
    }

    const result = schema.safeParse(raw);
    if (!result.success) {
        const firstIssue = result.error.issues[0];
        const field = firstIssue?.path?.join('.') || undefined;
        return fail(E.VALIDATION_ERROR, firstIssue?.message || 'Dados inválidos', {
            status: 400,
            field,
            details: result.error.issues.map((i) => ({
                path: i.path.join('.'),
                message: i.message,
            })),
        });
    }

    return result.data;
}

/**
 * Type guard: checks whether the result from parseBody is a fail response.
 */
export function isFailResponse(value: unknown): value is ReturnType<typeof fail> {
    return value instanceof Response;
}
