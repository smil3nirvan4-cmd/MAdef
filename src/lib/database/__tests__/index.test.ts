import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// Force mock DB via env
beforeAll(() => {
    process.env.USE_MOCK_DB = 'true';
});

// Build mock repository matching IDatabaseFactory shape
const mockCuidador = {
    findById: vi.fn(),
    findByPhone: vi.fn(),
    findAllPending: vi.fn().mockResolvedValue([]),
    upsert: vi.fn(),
    update: vi.fn(),
};

const mockPaciente = {
    findByPhone: vi.fn(),
    findAllHighPriority: vi.fn().mockResolvedValue([]),
    search: vi.fn().mockResolvedValue([]),
    upsert: vi.fn(),
};

const mockWhatsapp = {
    getSession: vi.fn().mockResolvedValue(null),
    updateSession: vi.fn(),
};

const mockMessaging = {
    logMessage: vi.fn(),
    getHistory: vi.fn().mockResolvedValue([]),
    getAllRecent: vi.fn().mockResolvedValue([]),
};

const mockForm = {
    logSubmission: vi.fn(),
    getAll: vi.fn().mockResolvedValue([]),
};

const mockAvaliacao = {
    create: vi.fn(),
    findPending: vi.fn().mockResolvedValue([]),
};

const mockOrcamento = {
    create: vi.fn(),
    update: vi.fn(),
    findByPaciente: vi.fn().mockResolvedValue([]),
};

const mockAlocacao = {
    create: vi.fn(),
    update: vi.fn(),
    findByCuidador: vi.fn().mockResolvedValue([]),
    findByPaciente: vi.fn().mockResolvedValue([]),
};

const mockRepository = {
    cuidador: mockCuidador,
    paciente: mockPaciente,
    whatsapp: mockWhatsapp,
    messaging: mockMessaging,
    form: mockForm,
    avaliacao: mockAvaliacao,
    orcamento: mockOrcamento,
    alocacao: mockAlocacao,
};

// Mock the MockRepository import to use our controllable mocks
vi.mock('@/lib/repositories/mock-db', () => ({
    MockRepository: mockRepository,
}));

vi.mock('@/lib/observability/logger', () => ({
    default: {
        info: vi.fn().mockResolvedValue(undefined),
        warning: vi.fn().mockResolvedValue(undefined),
        error: vi.fn().mockResolvedValue(undefined),
        debug: vi.fn().mockResolvedValue(undefined),
        whatsapp: vi.fn().mockResolvedValue(undefined),
    },
}));

beforeEach(() => {
    vi.clearAllMocks();
});

describe('database/index - wrapper functions with MockRepository', () => {
    it('getCuidadoresAguardandoRH delegates to cuidador.findAllPending', async () => {
        const expected = [{ id: '1', nome: 'Test' }];
        mockCuidador.findAllPending.mockResolvedValue(expected);

        const { getCuidadoresAguardandoRH } = await import('../index');
        const result = await getCuidadoresAguardandoRH();

        expect(mockCuidador.findAllPending).toHaveBeenCalled();
        expect(result).toEqual(expected);
    });

    it('getCuidadorByPhone delegates to cuidador.findByPhone', async () => {
        const expected = { id: '1', telefone: '5511999990001' };
        mockCuidador.findByPhone.mockResolvedValue(expected);

        const { getCuidadorByPhone } = await import('../index');
        const result = await getCuidadorByPhone('5511999990001');

        expect(mockCuidador.findByPhone).toHaveBeenCalledWith('5511999990001');
        expect(result).toEqual(expected);
    });

    it('upsertCuidador delegates to cuidador.upsert', async () => {
        const expected = { id: '2', telefone: '5511999990002', nome: 'Maria' };
        mockCuidador.upsert.mockResolvedValue(expected);

        const { upsertCuidador } = await import('../index');
        const result = await upsertCuidador('5511999990002', { nome: 'Maria' });

        expect(mockCuidador.upsert).toHaveBeenCalledWith('5511999990002', { nome: 'Maria' });
        expect(result).toEqual(expected);
    });

    it('getPacientesPrioridadeAlta delegates to paciente.findAllHighPriority', async () => {
        const expected = [{ id: 'p1', prioridade: 'ALTA' }];
        mockPaciente.findAllHighPriority.mockResolvedValue(expected);

        const { getPacientesPrioridadeAlta } = await import('../index');
        const result = await getPacientesPrioridadeAlta();

        expect(mockPaciente.findAllHighPriority).toHaveBeenCalled();
        expect(result).toEqual(expected);
    });

    it('getPacienteByPhone delegates to paciente.findByPhone', async () => {
        const expected = { id: 'p1', telefone: '5511988880001' };
        mockPaciente.findByPhone.mockResolvedValue(expected);

        const { getPacienteByPhone } = await import('../index');
        const result = await getPacienteByPhone('5511988880001');

        expect(mockPaciente.findByPhone).toHaveBeenCalledWith('5511988880001');
        expect(result).toEqual(expected);
    });

    it('searchPaciente delegates to paciente.search', async () => {
        const expected = [{ id: 'p1', nome: 'Ana' }];
        mockPaciente.search.mockResolvedValue(expected);

        const { searchPaciente } = await import('../index');
        const result = await searchPaciente('Ana');

        expect(mockPaciente.search).toHaveBeenCalledWith('Ana');
        expect(result).toEqual(expected);
    });

    it('upsertPaciente delegates to paciente.upsert', async () => {
        const expected = { id: 'p2', telefone: '5511988880002', nome: 'Carlos' };
        mockPaciente.upsert.mockResolvedValue(expected);

        const { upsertPaciente } = await import('../index');
        const result = await upsertPaciente('5511988880002', { nome: 'Carlos' });

        expect(mockPaciente.upsert).toHaveBeenCalledWith('5511988880002', { nome: 'Carlos' });
        expect(result).toEqual(expected);
    });

    it('criarOrcamento delegates to orcamento.create', async () => {
        const input = { pacienteId: 'p1' };
        const expected = { id: 'o1', ...input, status: 'RASCUNHO' };
        mockOrcamento.create.mockResolvedValue(expected);

        const { criarOrcamento } = await import('../index');
        const result = await criarOrcamento(input);

        expect(mockOrcamento.create).toHaveBeenCalledWith(input);
        expect(result).toEqual(expected);
    });

    it('logMessage delegates to messaging.logMessage', async () => {
        mockMessaging.logMessage.mockResolvedValue(undefined);

        const { logMessage } = await import('../index');
        await logMessage({ telefone: '5511999990001', direcao: 'IN', conteudo: 'oi' });

        expect(mockMessaging.logMessage).toHaveBeenCalledWith({
            telefone: '5511999990001',
            direcao: 'IN',
            conteudo: 'oi',
        });
    });
});

describe('database/index - exports', () => {
    it('exports prisma as null (deprecated)', async () => {
        const mod = await import('../index');
        expect(mod.prisma).toBeNull();
    });

    it('exports DB object', async () => {
        const mod = await import('../index');
        expect(mod.DB).toBeDefined();
    });
});
