import { describe, expect, it } from 'vitest';
import {
    AppError,
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError,
    DatabaseError,
} from './errors';

describe('AppError hierarchy', () => {
    it('AppError carries code, statusCode, message and details', () => {
        const err = new AppError('CUSTOM', 418, 'teapot', { key: 'val' });
        expect(err).toBeInstanceOf(Error);
        expect(err).toBeInstanceOf(AppError);
        expect(err.code).toBe('CUSTOM');
        expect(err.statusCode).toBe(418);
        expect(err.message).toBe('teapot');
        expect(err.details).toEqual({ key: 'val' });
        expect(err.name).toBe('AppError');
    });

    it('ValidationError defaults to 400 and VALIDATION_ERROR code', () => {
        const err = new ValidationError('bad input');
        expect(err).toBeInstanceOf(AppError);
        expect(err.code).toBe('VALIDATION_ERROR');
        expect(err.statusCode).toBe(400);
        expect(err.name).toBe('ValidationError');
    });

    it('NotFoundError formats message with resource and id', () => {
        const err = new NotFoundError('Paciente', 'abc-123');
        expect(err.code).toBe('NOT_FOUND');
        expect(err.statusCode).toBe(404);
        expect(err.message).toContain('Paciente');
        expect(err.message).toContain('abc-123');
        expect(err.details).toEqual({ resource: 'Paciente', id: 'abc-123' });
    });

    it('NotFoundError works without id', () => {
        const err = new NotFoundError('Orcamento');
        expect(err.message).toContain('Orcamento');
        expect(err.details).toEqual({ resource: 'Orcamento', id: undefined });
    });

    it('UnauthorizedError defaults to 401', () => {
        const err = new UnauthorizedError();
        expect(err.code).toBe('UNAUTHORIZED');
        expect(err.statusCode).toBe(401);
    });

    it('ForbiddenError defaults to 403', () => {
        const err = new ForbiddenError();
        expect(err.code).toBe('FORBIDDEN');
        expect(err.statusCode).toBe(403);
    });

    it('ConflictError defaults to 409', () => {
        const err = new ConflictError('duplicate');
        expect(err.code).toBe('CONFLICT');
        expect(err.statusCode).toBe(409);
    });

    it('DatabaseError defaults to 503', () => {
        const err = new DatabaseError('schema drift');
        expect(err.code).toBe('DATABASE_ERROR');
        expect(err.statusCode).toBe(503);
    });

    it('all subclasses are instanceof AppError', () => {
        const errors = [
            new ValidationError('x'),
            new NotFoundError('x'),
            new UnauthorizedError(),
            new ForbiddenError(),
            new ConflictError('x'),
            new DatabaseError('x'),
        ];
        for (const err of errors) {
            expect(err).toBeInstanceOf(AppError);
            expect(err).toBeInstanceOf(Error);
        }
    });
});
