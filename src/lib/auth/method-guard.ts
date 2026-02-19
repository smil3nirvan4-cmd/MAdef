import type { AdminRole } from './roles';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function isWriteBlocked(role: AdminRole, method: string): boolean {
    const normalizedMethod = String(method || 'GET').toUpperCase();
    return role === 'LEITURA' && WRITE_METHODS.has(normalizedMethod);
}

export function guardWriteMethod(role: AdminRole, method: string): void {
    if (isWriteBlocked(role, method)) {
        throw {
            code: 'FORBIDDEN',
            message: 'Read-only role cannot perform write operations',
        };
    }
}
