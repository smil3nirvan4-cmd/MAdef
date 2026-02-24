import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    orcamentoFindMany: vi.fn(),
    orcamentoCreate: vi.fn(),
    systemLogCreate: vi.fn(),
}));

vi.mock('@/auth', () => ({
    auth: mocks.auth,
}));

vi.mock('@/lib/prisma', () => ({
    prisma: {
        orcamento: {
            findMany: mocks.orcamentoFindMany,
            create: mocks.orcamentoCreate,
        },
        systemLog: {
            create: mocks.systemLogCreate,
        },
    },
}));

vi.mock('@/lib/pricing/config-service', () => ({
    getPricingConfigSnapshot: vi.fn().mockResolvedValue({
        unidadeId: 'u1',
        configVersionId: 'cv1',
        currency: 'BRL',
    }),
}));

import { GET, POST } from '@/app/api/admin/orcamentos/route';

function makeReq(url: string, options?: RequestInit): NextRequest {
    return new Request(url, options) as unknown as NextRequest;
}

describe('GET /api/admin/orcamentos', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns 401 when not authenticated', async () => {
        mocks.auth.mockResolvedValue(null);
        const response = await GET(makeReq('https://example.com/api/admin/orcamentos'));
        const body = await response.json();

        expect(response.status).toBe(401);
        expect(body.success).toBe(false);
    });

    it('returns 200 with orcamentos when authenticated', async () => {
        mocks.auth.mockResolvedValue({ user: { email: 'admin@test.com' } });
        process.env.ADMIN_EMAIL = 'admin@test.com';

        mocks.orcamentoFindMany.mockResolvedValue([
            { id: 'o1', pacienteId: 'p1', status: 'RASCUNHO', paciente: { id: 'p1', nome: 'Ana' } },
        ]);

        const response = await GET(makeReq('https://example.com/api/admin/orcamentos'));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data).toHaveLength(1);
    });
});

describe('POST /api/admin/orcamentos', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns 400 when pacienteId is missing', async () => {
        mocks.auth.mockResolvedValue({ user: { email: 'admin@test.com' } });
        process.env.ADMIN_EMAIL = 'admin@test.com';

        const response = await POST(
            makeReq('https://example.com/api/admin/orcamentos', {
                method: 'POST',
                body: JSON.stringify({}),
                headers: { 'content-type': 'application/json' },
            }),
        );
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.success).toBe(false);
    });
});
