import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Hoisted mocks — must be declared before any vi.mock() calls
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
    guardCapability: vi.fn(),
    checkRateLimit: vi.fn(),
    getClientIp: vi.fn(),
    pacienteRepository: {
        findAll: vi.fn(),
        countByStatus: vi.fn(),
        findByPhone: vi.fn(),
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
            // Reproduce AppError handling so ConflictError returns proper status
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
    pacienteRepository: mocks.pacienteRepository,
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
    const url = new URL('https://example.com/api/admin/pacientes');
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
const samplePaciente = {
    id: 'pac-1',
    nome: 'Maria Silva',
    telefone: '5511999990001',
    cidade: 'São Paulo',
    bairro: 'Centro',
    tipo: 'HOME_CARE',
    status: 'LEAD',
    prioridade: 'NORMAL',
    createdAt: new Date().toISOString(),
    _count: { avaliacoes: 2, orcamentos: 1, alocacoes: 0, mensagens: 5 },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('/api/admin/pacientes', () => {
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
            mocks.pacienteRepository.findAll.mockResolvedValue({
                data: [samplePaciente],
                total: 1,
                page: 1,
                pageSize: 20,
            });
            mocks.pacienteRepository.countByStatus.mockResolvedValue({
                total: 10,
                ativo: 5,
                lead: 3,
                avaliacao: 2,
            });
        });

        it('returns paginated list with correct format', async () => {
            const response = await GET(req());
            const payload = await response.json();

            expect(response.status).toBe(200);
            expect(payload.success).toBe(true);
            expect(Array.isArray(payload.data)).toBe(true);
            expect(payload.data).toHaveLength(1);
            expect(payload.data[0].id).toBe('pac-1');
            expect(payload.pagination).toBeDefined();
            expect(payload.pagination.page).toBe(1);
            expect(payload.pagination.pageSize).toBe(20);
            expect(payload.pagination.total).toBe(1);
            expect(payload.pagination.totalPages).toBe(1);
            expect(payload.pagination.hasNext).toBe(false);
            expect(payload.pagination.hasPrev).toBe(false);
        });

        it('includes stats in response', async () => {
            const response = await GET(req());
            const payload = await response.json();

            expect(payload.stats).toEqual({
                total: 10,
                ativos: 5,
                leads: 3,
                avaliacao: 2,
            });
        });

        it('passes search param to repository', async () => {
            await GET(req(undefined, { search: 'Maria' }));

            expect(mocks.pacienteRepository.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ search: 'Maria' }),
            );
        });

        it('passes status filter to repository', async () => {
            await GET(req(undefined, { status: 'ATIVO' }));

            expect(mocks.pacienteRepository.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'ATIVO' }),
            );
        });

        it('ignores ALL as status filter', async () => {
            await GET(req(undefined, { status: 'ALL' }));

            expect(mocks.pacienteRepository.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ status: undefined }),
            );
        });

        it('passes pagination params to repository', async () => {
            await GET(req(undefined, { page: '2', pageSize: '10' }));

            expect(mocks.pacienteRepository.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ page: 2, pageSize: 10 }),
            );
        });

        it('passes sort params to repository', async () => {
            await GET(req(undefined, { sort: 'nome:asc' }));

            expect(mocks.pacienteRepository.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ sortField: 'nome', sortDirection: 'asc' }),
            );
        });

        it('passes cidade filter to repository', async () => {
            await GET(req(undefined, { cidade: 'São Paulo' }));

            expect(mocks.pacienteRepository.findAll).toHaveBeenCalledWith(
                expect.objectContaining({ cidade: 'São Paulo' }),
            );
        });

        it('calls guardCapability with VIEW_PACIENTES', async () => {
            await GET(req());

            expect(mocks.guardCapability).toHaveBeenCalledWith('VIEW_PACIENTES');
        });

        it('returns paginated response for empty results', async () => {
            mocks.pacienteRepository.findAll.mockResolvedValue({
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
            mocks.pacienteRepository.findByPhone.mockResolvedValue(null);
            mocks.pacienteRepository.create.mockResolvedValue({
                id: 'pac-new',
                nome: 'João Santos',
                telefone: '5511999990002',
                cidade: null,
                bairro: null,
                tipo: 'HOME_CARE',
                status: 'LEAD',
                prioridade: 'NORMAL',
                createdAt: new Date().toISOString(),
            });
        });

        it('creates paciente with valid body', async () => {
            const body = {
                telefone: '5511999990002',
                nome: 'João Santos',
                cidade: 'Rio de Janeiro',
            };

            const response = await POST(req(body));
            const payload = await response.json();

            expect(response.status).toBe(201);
            expect(payload.success).toBe(true);
            expect(payload.data.paciente.id).toBe('pac-new');
        });

        it('creates paciente with only telefone (minimal required)', async () => {
            const body = { telefone: '5511999990002' };

            const response = await POST(req(body));
            const payload = await response.json();

            expect(response.status).toBe(201);
            expect(payload.success).toBe(true);
            expect(mocks.pacienteRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    telefone: '5511999990002',
                    tipo: 'HOME_CARE',
                    status: 'LEAD',
                    prioridade: 'NORMAL',
                }),
            );
        });

        it('returns 400 when telefone is missing', async () => {
            const body = { nome: 'João Santos' };

            const response = await POST(req(body));
            const payload = await response.json();

            expect(response.status).toBe(400);
            expect(payload.success).toBe(false);
            expect(payload.error.code).toBe('VALIDATION_ERROR');
        });

        it('returns 400 when telefone is empty string', async () => {
            const body = { telefone: '' };

            const response = await POST(req(body));
            const payload = await response.json();

            expect(response.status).toBe(400);
            expect(payload.success).toBe(false);
        });

        it('returns 400 when body is invalid JSON', async () => {
            const request = new Request('https://example.com/api/admin/pacientes', {
                method: 'POST',
                body: 'not-json',
                headers: { 'content-type': 'application/json' },
            }) as unknown as NextRequest;

            const response = await POST(request);
            const payload = await response.json();

            expect(response.status).toBe(400);
            expect(payload.success).toBe(false);
        });

        it('returns 409 when phone already exists', async () => {
            mocks.pacienteRepository.findByPhone.mockResolvedValue({
                id: 'pac-existing',
                telefone: '5511999990002',
            });

            const body = { telefone: '5511999990002', nome: 'Duplicado' };

            const response = await POST(req(body));
            const payload = await response.json();

            expect(response.status).toBe(409);
            expect(payload.success).toBe(false);
            expect(payload.error.code).toBe('CONFLICT');
        });

        it('calls guardCapability with MANAGE_PACIENTES', async () => {
            const body = { telefone: '5511999990002' };
            await POST(req(body));

            expect(mocks.guardCapability).toHaveBeenCalledWith('MANAGE_PACIENTES');
        });

        it('applies default values for optional fields', async () => {
            const body = { telefone: '5511999990002' };
            await POST(req(body));

            expect(mocks.pacienteRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    tipo: 'HOME_CARE',
                    prioridade: 'NORMAL',
                    status: 'LEAD',
                    nome: null,
                    cidade: null,
                    bairro: null,
                    hospital: null,
                    quarto: null,
                }),
            );
        });

        it('passes all optional fields to repository when provided', async () => {
            const body = {
                telefone: '5511999990002',
                nome: 'João Santos',
                cidade: 'São Paulo',
                bairro: 'Centro',
                tipo: 'HOSPITALAR',
                hospital: 'Hospital ABC',
                quarto: '301',
                prioridade: 'ALTA',
                status: 'ATIVO',
            };
            await POST(req(body));

            expect(mocks.pacienteRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    telefone: '5511999990002',
                    nome: 'João Santos',
                    cidade: 'São Paulo',
                    bairro: 'Centro',
                    tipo: 'HOSPITALAR',
                    hospital: 'Hospital ABC',
                    quarto: '301',
                    prioridade: 'ALTA',
                    status: 'ATIVO',
                }),
            );
        });
    });
});
