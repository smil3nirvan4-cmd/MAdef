import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    avaliacaoFindMany: vi.fn(),
    avaliacaoCount: vi.fn(),
    avaliacaoCreate: vi.fn(),
    systemLogCreate: vi.fn(),
}));

vi.mock('@/auth', () => ({
    auth: mocks.auth,
}));

vi.mock('@/lib/prisma', () => ({
    prisma: {
        avaliacao: {
            findMany: mocks.avaliacaoFindMany,
            count: mocks.avaliacaoCount,
            create: mocks.avaliacaoCreate,
        },
        systemLog: {
            create: mocks.systemLogCreate,
        },
    },
}));

vi.mock('@/lib/observability/request-context', () => ({
    RequestContext: {
        run: (_ctx: any, fn: () => any) => fn(),
        getRequestId: () => 'test-req-id',
        getDurationMs: () => 0,
    },
}));

import { GET, POST } from '@/app/api/admin/avaliacoes/route';

function makeReq(url: string, options?: RequestInit): NextRequest {
    return new Request(url, options) as unknown as NextRequest;
}

describe('GET /api/admin/avaliacoes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns 401 when not authenticated', async () => {
        mocks.auth.mockResolvedValue(null);

        const response = await GET(
            makeReq('https://example.com/api/admin/avaliacoes'),
        );
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.success).toBe(false);
    });

    it('returns 200 with paginated avaliacoes when authenticated', async () => {
        mocks.auth.mockResolvedValue({ user: { email: 'admin@test.com' } });
        process.env.ADMIN_EMAIL = 'admin@test.com';

        mocks.avaliacaoFindMany.mockResolvedValue([
            { id: 'a1', pacienteId: 'p1', status: 'PENDENTE', paciente: { id: 'p1', nome: 'Ana' } },
        ]);
        mocks.avaliacaoCount.mockResolvedValue(1);

        const response = await GET(
            makeReq('https://example.com/api/admin/avaliacoes?page=1&pageSize=10'),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data).toHaveLength(1);
    });
});

describe('POST /api/admin/avaliacoes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns 400 when pacienteId is missing', async () => {
        mocks.auth.mockResolvedValue({ user: { email: 'admin@test.com' } });
        process.env.ADMIN_EMAIL = 'admin@test.com';

        const response = await POST(
            makeReq('https://example.com/api/admin/avaliacoes', {
                method: 'POST',
                body: JSON.stringify({ status: 'PENDENTE' }),
                headers: { 'content-type': 'application/json' },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.success).toBe(false);
        expect(body.error.field).toBe('pacienteId');
    });
});
