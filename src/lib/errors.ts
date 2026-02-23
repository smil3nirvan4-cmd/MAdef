import { E } from '@/lib/api/error-codes';

/**
 * Base application error class.
 * When thrown inside a route handler wrapped with withErrorBoundary,
 * the boundary converts it to a structured fail() response automatically.
 */
export class AppError extends Error {
    constructor(
        public readonly code: string,
        public readonly statusCode: number,
        message: string,
        public readonly details?: Record<string, unknown>,
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export class ValidationError extends AppError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(E.VALIDATION_ERROR, 400, message, details);
        this.name = 'ValidationError';
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string, id?: string) {
        const message = id
            ? `${resource} não encontrado(a): ${id}`
            : `${resource} não encontrado(a)`;
        super(E.NOT_FOUND, 404, message, { resource, id });
        this.name = 'NotFoundError';
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Autenticação necessária') {
        super(E.UNAUTHORIZED, 401, message);
        this.name = 'UnauthorizedError';
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Sem permissão para esta ação') {
        super(E.FORBIDDEN, 403, message);
        this.name = 'ForbiddenError';
    }
}

export class ConflictError extends AppError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(E.CONFLICT, 409, message, details);
        this.name = 'ConflictError';
    }
}

export class DatabaseError extends AppError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(E.DATABASE_ERROR, 503, message, details);
        this.name = 'DatabaseError';
    }
}
