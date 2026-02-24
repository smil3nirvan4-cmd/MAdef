import { describe, it, expect, vi } from 'vitest';

/**
 * E2E Smoke Tests — verify critical API routes return expected shapes.
 * These test the route handler functions directly (not HTTP), ensuring
 * the entire middleware chain (withErrorBoundary, guardCapability, etc.)
 * doesn't crash.
 */

// Mock auth to return admin session
vi.mock('@/auth', () => ({
    auth: vi.fn().mockResolvedValue({
        user: { email: 'admin@test.com', name: 'Admin' },
    }),
}));

// Mock prisma
vi.mock('@/lib/prisma', () => ({
    prisma: {
        $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]),
        paciente: {
            findMany: vi.fn().mockResolvedValue([]),
            count: vi.fn().mockResolvedValue(0),
        },
        avaliacao: {
            findMany: vi.fn().mockResolvedValue([]),
            count: vi.fn().mockResolvedValue(0),
        },
        orcamento: {
            findMany: vi.fn().mockResolvedValue([]),
            count: vi.fn().mockResolvedValue(0),
        },
        systemLog: {
            create: vi.fn().mockResolvedValue({}),
            findMany: vi.fn().mockResolvedValue([]),
            count: vi.fn().mockResolvedValue(0),
        },
        consentRecord: {
            findMany: vi.fn().mockResolvedValue([]),
        },
    },
}));

vi.mock('@/lib/db/schema-capabilities', () => ({
    getDbSchemaCapabilities: vi.fn().mockResolvedValue({
        dbSchemaOk: true,
        missingColumns: [],
    }),
}));

vi.mock('@/lib/redis/client', () => ({
    getRedis: vi.fn().mockResolvedValue(null),
}));

// Mock env for admin role resolution
process.env.ADMIN_EMAILS = 'admin@test.com';

describe('E2E Smoke Tests', () => {
    it('GET /api/health returns health status', async () => {
        const { GET } = await import('@/app/api/health/route');
        const response = await GET();
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.status).toBeDefined();
        expect(body.checks).toBeDefined();
    });

    it('GET /api/docs returns OpenAPI spec', async () => {
        const { GET } = await import('@/app/api/docs/route');
        const response = await GET();
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.openapi).toBe('3.1.0');
        expect(body.paths).toBeDefined();
    });

    it('GET /api/metrics returns metrics snapshot', async () => {
        const { GET } = await import('@/app/api/metrics/route');
        const response = await GET();
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
        expect(body.memory).toBeDefined();
    });
});
