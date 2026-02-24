import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    pacienteFindMany: vi.fn(),
    pacienteCount: vi.fn(),
    pacienteFindUnique: vi.fn(),
    pacienteCreate: vi.fn(),
    systemLogCreate: vi.fn(),
}));

vi.mock('@/auth', () => ({
    auth: mocks.auth,
}));

vi.mock('@/lib/prisma', () => ({
    prisma: {
        paciente: {
            findMany: mocks.pacienteFindMany,
            count: mocks.pacienteCount,
            findUnique: mocks.pacienteFindUnique,
            create: mocks.pacienteCreate,
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

import { GET, POST } from '@/app/api/admin/pacientes/route';

function makeReq(url: string, options?: RequestInit): NextRequest {
    return new Request(url, options) as unknown as NextRequest;
}

describe('GET /api/admin/pacientes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns 401 when no auth session', async () => {
        mocks.auth.mockResolvedValue(null);

        const response = await GET(
            makeReq('https://example.com/api/admin/pacientes'),
        );
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.success).toBe(false);
    });

    it('returns 200 with paginated data when authenticated with capability', async () => {
        mocks.auth.mockResolvedValue({
            user: { email: 'admin@test.com' },
        });
        process.env.ADMIN_EMAIL = 'admin@test.com';

        mocks.pacienteFindMany.mockResolvedValue([
            { id: 'p1', nome: 'Ana', telefone: '5511999990001', status: 'LEAD' },
        ]);
        mocks.pacienteCount.mockResolvedValue(1);

        const response = await GET(
            makeReq('https://example.com/api/admin/pacientes?page=1&pageSize=10'),
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data).toHaveLength(1);
        expect(body.data[0].nome).toBe('Ana');
    });
});

describe('POST /api/admin/pacientes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns 400 when telefone is missing', async () => {
        mocks.auth.mockResolvedValue({
            user: { email: 'admin@test.com' },
        });
        process.env.ADMIN_EMAIL = 'admin@test.com';

        const response = await POST(
            makeReq('https://example.com/api/admin/pacientes', {
                method: 'POST',
                body: JSON.stringify({ nome: 'Test' }),
                headers: { 'content-type': 'application/json' },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.success).toBe(false);
        expect(body.error.field).toBe('telefone');
    });
});
