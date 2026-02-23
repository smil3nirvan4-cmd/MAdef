import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Hoisted mocks — must be declared before any vi.mock() calls
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
    guardCapability: vi.fn(),
    checkRateLimit: vi.fn(),
    getClientIp: vi.fn(),
    avaliacaoRepository: {
        findAll: vi.fn(),
        create: vi.fn(),
    },
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock('@/lib/auth/capability-guard', () => ({
    guardCapability: mocks.guardCapability,
}));

vi.mock('@/lib/api/rate-limit', () => ({
    checkRateLimit: mocks.checkRateLimit,
    getClientIp: mocks.getClientIp,
}));

vi.mock('@/lib/api/with-rate-limit', () => ({
    withRateLimit: (handler: Function) => handler,
}));

vi.mock('@/lib/api/with-error-boundary', () => ({
    withErrorBoundary: (handler: Function) => async (...args: unknown[]) => {
        try {
            return await handler(...args);
        } catch (err: any) {
            if (err && typeof err === 'object' && 'statusCode' in err && 'code' in err) {
                return Response.json(
                    {
                        success: false,
                        error: { code: err.code, message: err.message, details: err.details },
                    },
                    { status: err.statusCode },
                );
            }
            const message = err?.message || 'Internal server error';
            return Response.json(
                { success: false, error: { code: 'INTERNAL_ERROR', message } },
                { status: 500 },
            );
        }
    },
}));

vi.mock('@/lib/api/with-request-context', () => ({
    withRequestContext: (handler: Function) => handler,
}));

vi.mock('@/lib/repositories', () => ({
    avaliacaoRepository: mocks.avaliacaoRepository,
}));

vi.mock('@/lib/observability/logger', () => ({
    default: {
        info: vi.fn().mockResolvedValue(undefined),
        warning: vi.fn().mockResolvedValue(undefined),
        error: vi.fn().mockResolvedValue(undefined),
    },
}));

// ---------------------------------------------------------------------------
// Import the route handlers AFTER mocks are set up
// ---------------------------------------------------------------------------
import { GET, POST } from './route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function req(body?: unknown, params?: Record<string, string>): NextRequest {
    const url = new URL('https://example.com/api/admin/avaliacoes');
    if (params) {
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    if (body) {
        return new Request(url, {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'content-type': 'application/json' },
        }) as unknown as NextRequest;
    }
    return new Request(url) as unknown as NextRequest;
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------
const sampleAvaliacao = {
    id: 'av-1',
    pacienteId: 'pac-1',
    status: 'PENDENTE',
    abemidScore: 12,
    katzScore: 4,
    lawtonScore: 15,
    gqp: null,
    nivelSugerido: 'MEDIO',
    cargaSugerida: '12h',
    nivelFinal: null,
    cargaFinal: null,
    dadosDetalhados: null,
    createdAt: new Date().toISOString(),
    paciente: {
        id: 'pac-1',
        nome: 'Maria Silva',
        telefone: '5511999990001',
        tipo: 'HOME_CARE',
        cidade: 'São Paulo',
    },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('/api/admin/avaliacoes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.guardCapability.mockResolvedValue({ role: 'ADMIN', userId: 'admin@test.com' });
        mocks.getClientIp.mockReturnValue('127.0.0.1');
        mocks.checkRateLimit.mockReturnValue({ allowed: true, retryAfterMs: 0, remaining: 10 });
    });

    // =======================================================================
    // GET
    // =======================================================================
    describe('GET', () => {
        beforeEach(() => {
            mocks.avaliacaoRepository.findAll.mockResolvedValue({
                data: [sampleAvaliacao],
                total: 1,
                page: 1,
                pageSize: 20,
            });
        });

        it('returns paginated list with correct format', async () => {
            const response = await GET(req());
            const payload = await response.json();

            expect(response.status).toBe(200);
            expect(payload.success).toBe(true);
            expect(Array.isArray(payload.data)).toBe(true);
            expect(payload.data).toHaveLength(1);
            expect(payload.data[0].id).toBe('av-1');
            expect(payload.pagination).toBeDefined();
            expect(payload.pagination.page).toBe(1);
            expect(payload.pagination.pageSize).toBe(20);
            expect(payload.pagination.total).toBe(1);
            expect(payload.pagination.totalPages).toBe(1);
            expect(payload.pagination.hasNext).toBe(false);
            expect(payload.pagination.hasPrev).toBe(false);
        });

        it('includes paciente relation in response', async () => {
            const response = await GET(req());
            const payload = await response.json();

            expect(payload.data[0].paciente).toBeDefined();
            expect(payload.data[0].paciente.nome).toBe('Maria Silva');
        });

        it('passes search param to repository', async () => {
            await GET(req(undefined, { search: 'Maria' }));

            expect(mocks.avaliacaoRepository.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ search: 'Maria' }),
            );
        });

        it('passes status filter to repository', async () => {
            await GET(req(undefined, { status: 'CONCLUIDA' }));

            expect(mocks.avaliacaoRepository.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'CONCLUIDA' }),
            );
        });

        it('ignores ALL as status filter', async () => {
            await GET(req(undefined, { status: 'ALL' }));

            expect(mocks.avaliacaoRepository.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ status: undefined }),
            );
        });

        it('passes tipo filter to repository', async () => {
            await GET(req(undefined, { tipo: 'HOME_CARE' }));

            expect(mocks.avaliacaoRepository.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ tipo: 'HOME_CARE' }),
            );
        });

        it('ignores ALL as tipo filter', async () => {
            await GET(req(undefined, { tipo: 'ALL' }));

            expect(mocks.avaliacaoRepository.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ tipo: undefined }),
            );
        });

        it('passes date range filters to repository', async () => {
            await GET(req(undefined, { createdFrom: '2026-01-01', createdTo: '2026-02-01' }));

            expect(mocks.avaliacaoRepository.findAll).toHaveBeenCalledWith(
                expect.objectContaining({
                    createdFrom: '2026-01-01',
                    createdTo: '2026-02-01',
                }),
            );
        });

        it('passes pagination params to repository', async () => {
            await GET(req(undefined, { page: '3', pageSize: '5' }));

            expect(mocks.avaliacaoRepository.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ page: 3, pageSize: 5 }),
            );
        });

        it('passes sort params to repository', async () => {
            await GET(req(undefined, { sort: 'status:asc' }));

            expect(mocks.avaliacaoRepository.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ sortField: 'status', sortDirection: 'asc' }),
            );
        });

        it('calls guardCapability with VIEW_AVALIACOES', async () => {
            await GET(req());

            expect(mocks.guardCapability).toHaveBeenCalledWith('VIEW_AVALIACOES');
        });

        it('returns paginated response for empty results', async () => {
            mocks.avaliacaoRepository.findAll.mockResolvedValue({
                data: [],
                total: 0,
                page: 1,
                pageSize: 20,
            });

            const response = await GET(req());
            const payload = await response.json();

            expect(response.status).toBe(200);
            expect(payload.success).toBe(true);
            expect(payload.data).toEqual([]);
            expect(payload.pagination.total).toBe(0);
        });
    });

    // =======================================================================
    // POST
    // =======================================================================
    describe('POST', () => {
        beforeEach(() => {
            mocks.avaliacaoRepository.create.mockResolvedValue({
                id: 'av-new',
                pacienteId: 'pac-1',
                status: 'PENDENTE',
                abemidScore: 12,
                katzScore: 4,
                lawtonScore: 15,
                gqp: null,
                nivelSugerido: 'MEDIO',
                cargaSugerida: '12h',
                nivelFinal: null,
                cargaFinal: null,
                dadosDetalhados: null,
                createdAt: new Date().toISOString(),
                paciente: { id: 'pac-1', nome: 'Maria Silva', telefone: '5511999990001' },
            });
        });

        it('creates avaliacao with valid body', async () => {
            const body = {
                pacienteId: 'pac-1',
                abemidScore: 12,
                katzScore: 4,
                lawtonScore: 15,
                nivelSugerido: 'MEDIO',
                cargaSugerida: '12h',
            };

            const response = await POST(req(body));
            const payload = await response.json();

            expect(response.status).toBe(201);
            expect(payload.success).toBe(true);
            expect(payload.data.avaliacao.id).toBe('av-new');
        });

        it('creates avaliacao with only pacienteId (minimal required)', async () => {
            const body = { pacienteId: 'pac-1' };

            const response = await POST(req(body));
            const payload = await response.json();

            expect(response.status).toBe(201);
            expect(payload.success).toBe(true);
            expect(mocks.avaliacaoRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    paciente: { connect: { id: 'pac-1' } },
                    status: 'PENDENTE',
                    abemidScore: null,
                    katzScore: null,
                    lawtonScore: null,
                    gqp: null,
                }),
            );
        });

        it('returns 400 when pacienteId is missing', async () => {
            const body = { abemidScore: 12 };

            const response = await POST(req(body));
            const payload = await response.json();

            expect(response.status).toBe(400);
            expect(payload.success).toBe(false);
            expect(payload.error.code).toBe('VALIDATION_ERROR');
        });

        it('returns 400 when pacienteId is empty string', async () => {
            const body = { pacienteId: '' };

            const response = await POST(req(body));
            const payload = await response.json();

            expect(response.status).toBe(400);
            expect(payload.success).toBe(false);
        });

        it('returns 400 when body is invalid JSON', async () => {
            const request = new Request('https://example.com/api/admin/avaliacoes', {
                method: 'POST',
                body: 'not-json',
                headers: { 'content-type': 'application/json' },
            }) as unknown as NextRequest;

            const response = await POST(request);
            const payload = await response.json();

            expect(response.status).toBe(400);
            expect(payload.success).toBe(false);
        });

        it('calls guardCapability with MANAGE_AVALIACOES', async () => {
            const body = { pacienteId: 'pac-1' };
            await POST(req(body));

            expect(mocks.guardCapability).toHaveBeenCalledWith('MANAGE_AVALIACOES');
        });

        it('applies default values for optional fields', async () => {
            const body = { pacienteId: 'pac-1' };
            await POST(req(body));

            expect(mocks.avaliacaoRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    status: 'PENDENTE',
                    abemidScore: null,
                    katzScore: null,
                    lawtonScore: null,
                    gqp: null,
                    nivelSugerido: null,
                    cargaSugerida: null,
                    nivelFinal: null,
                    cargaFinal: null,
                    dadosDetalhados: null,
                }),
            );
        });

        it('passes all optional fields to repository when provided', async () => {
            const body = {
                pacienteId: 'pac-1',
                status: 'CONCLUIDA',
                abemidScore: 18,
                katzScore: 6,
                lawtonScore: 20,
                gqp: 85,
                nivelSugerido: 'ALTO',
                cargaSugerida: '24h',
                nivelFinal: 'ALTO',
                cargaFinal: '24h',
                dadosDetalhados: { extra: 'data' },
            };
            await POST(req(body));

            expect(mocks.avaliacaoRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    paciente: { connect: { id: 'pac-1' } },
                    status: 'CONCLUIDA',
                    abemidScore: 18,
                    katzScore: 6,
                    lawtonScore: 20,
                    gqp: 85,
                    nivelSugerido: 'ALTO',
                    cargaSugerida: '24h',
                    nivelFinal: 'ALTO',
                    cargaFinal: '24h',
                    dadosDetalhados: '{"extra":"data"}',
                }),
            );
        });

        it('serializes dadosDetalhados to JSON string', async () => {
            const body = {
                pacienteId: 'pac-1',
                dadosDetalhados: { respostas: [1, 2, 3], observacao: 'test' },
            };
            await POST(req(body));

            expect(mocks.avaliacaoRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    dadosDetalhados: JSON.stringify({ respostas: [1, 2, 3], observacao: 'test' }),
                }),
            );
        });

        it('sets dadosDetalhados to null when not provided', async () => {
            const body = { pacienteId: 'pac-1' };
            await POST(req(body));

            expect(mocks.avaliacaoRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    dadosDetalhados: null,
                }),
            );
        });
    });
});
