import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
    paciente: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { pacienteRepository } from './paciente.repository';

describe('pacienteRepository', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ---------- findAll ----------
    describe('findAll', () => {
        it('returns paginated results with defaults (page=1, pageSize=20)', async () => {
            const fakePacientes = [{ id: '1', nome: 'Ana' }];
            mockPrisma.paciente.findMany.mockResolvedValue(fakePacientes);
            mockPrisma.paciente.count.mockResolvedValue(1);

            const result = await pacienteRepository.findAll();

            expect(result).toEqual({ data: fakePacientes, total: 1, page: 1, pageSize: 20 });
            expect(mockPrisma.paciente.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ skip: 0, take: 20 }),
            );
        });

        it('applies pagination correctly for page 3, pageSize 10', async () => {
            mockPrisma.paciente.findMany.mockResolvedValue([]);
            mockPrisma.paciente.count.mockResolvedValue(0);

            await pacienteRepository.findAll({ page: 3, pageSize: 10 });

            expect(mockPrisma.paciente.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ skip: 20, take: 10 }),
            );
        });

        it('filters by status when provided', async () => {
            mockPrisma.paciente.findMany.mockResolvedValue([]);
            mockPrisma.paciente.count.mockResolvedValue(0);

            await pacienteRepository.findAll({ status: 'ATIVO' });

            const callArg = mockPrisma.paciente.findMany.mock.calls[0][0];
            expect(callArg.where).toEqual(expect.objectContaining({ status: 'ATIVO' }));
        });

        it('filters by tipo when provided', async () => {
            mockPrisma.paciente.findMany.mockResolvedValue([]);
            mockPrisma.paciente.count.mockResolvedValue(0);

            await pacienteRepository.findAll({ tipo: 'HOME_CARE' });

            const callArg = mockPrisma.paciente.findMany.mock.calls[0][0];
            expect(callArg.where).toEqual(expect.objectContaining({ tipo: 'HOME_CARE' }));
        });

        it('filters by cidade with contains when provided', async () => {
            mockPrisma.paciente.findMany.mockResolvedValue([]);
            mockPrisma.paciente.count.mockResolvedValue(0);

            await pacienteRepository.findAll({ cidade: 'Curitiba' });

            const callArg = mockPrisma.paciente.findMany.mock.calls[0][0];
            expect(callArg.where).toEqual(expect.objectContaining({ cidade: { contains: 'Curitiba' } }));
        });

        it('builds OR search across nome, telefone, cidade, bairro', async () => {
            mockPrisma.paciente.findMany.mockResolvedValue([]);
            mockPrisma.paciente.count.mockResolvedValue(0);

            await pacienteRepository.findAll({ search: 'Maria' });

            const callArg = mockPrisma.paciente.findMany.mock.calls[0][0];
            expect(callArg.where.OR).toEqual([
                { nome: { contains: 'Maria' } },
                { telefone: { contains: 'Maria' } },
                { cidade: { contains: 'Maria' } },
                { bairro: { contains: 'Maria' } },
            ]);
        });

        it('uses custom sort field and direction when valid', async () => {
            mockPrisma.paciente.findMany.mockResolvedValue([]);
            mockPrisma.paciente.count.mockResolvedValue(0);

            await pacienteRepository.findAll({ sortField: 'nome', sortDirection: 'asc' });

            const callArg = mockPrisma.paciente.findMany.mock.calls[0][0];
            expect(callArg.orderBy).toEqual([{ nome: 'asc' }, { createdAt: 'desc' }]);
        });

        it('falls back to default orderBy when sortField is invalid', async () => {
            mockPrisma.paciente.findMany.mockResolvedValue([]);
            mockPrisma.paciente.count.mockResolvedValue(0);

            await pacienteRepository.findAll({ sortField: 'invalidField' });

            const callArg = mockPrisma.paciente.findMany.mock.calls[0][0];
            expect(callArg.orderBy).toEqual([{ createdAt: 'desc' }]);
        });

        it('includes _count for avaliacoes, orcamentos, alocacoes, mensagens', async () => {
            mockPrisma.paciente.findMany.mockResolvedValue([]);
            mockPrisma.paciente.count.mockResolvedValue(0);

            await pacienteRepository.findAll();

            const callArg = mockPrisma.paciente.findMany.mock.calls[0][0];
            expect(callArg.include).toEqual({
                _count: { select: { avaliacoes: true, orcamentos: true, alocacoes: true, mensagens: true } },
            });
        });
    });

    // ---------- findById ----------
    describe('findById', () => {
        it('returns the paciente with relations when found', async () => {
            const fakePaciente = { id: 'p1', nome: 'Carlos', avaliacoes: [], orcamentos: [], alocacoes: [], mensagens: [] };
            mockPrisma.paciente.findUnique.mockResolvedValue(fakePaciente);

            const result = await pacienteRepository.findById('p1');

            expect(result).toEqual(fakePaciente);
            expect(mockPrisma.paciente.findUnique).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: 'p1' } }),
            );
        });

        it('returns null when paciente does not exist', async () => {
            mockPrisma.paciente.findUnique.mockResolvedValue(null);

            const result = await pacienteRepository.findById('non-existent');

            expect(result).toBeNull();
        });

        it('includes related avaliacoes, orcamentos, alocacoes and mensagens', async () => {
            mockPrisma.paciente.findUnique.mockResolvedValue(null);

            await pacienteRepository.findById('p1');

            const callArg = mockPrisma.paciente.findUnique.mock.calls[0][0];
            expect(callArg.include).toEqual({
                avaliacoes: { orderBy: { createdAt: 'desc' }, take: 20 },
                orcamentos: { orderBy: { createdAt: 'desc' }, take: 10 },
                alocacoes: { include: { cuidador: true }, orderBy: { createdAt: 'desc' }, take: 10 },
                mensagens: { orderBy: { timestamp: 'desc' }, take: 100 },
            });
        });
    });

    // ---------- create ----------
    describe('create', () => {
        it('calls prisma.paciente.create with the provided data', async () => {
            const input = { nome: 'Nova Paciente', telefone: '11999990000' };
            const created = { id: 'new-id', ...input };
            mockPrisma.paciente.create.mockResolvedValue(created);

            const result = await pacienteRepository.create(input as any);

            expect(result).toEqual(created);
            expect(mockPrisma.paciente.create).toHaveBeenCalledWith({ data: input });
        });
    });

    // ---------- update ----------
    describe('update', () => {
        it('calls prisma.paciente.update with correct where and data', async () => {
            const updated = { id: 'p1', nome: 'Updated Name' };
            mockPrisma.paciente.update.mockResolvedValue(updated);

            const result = await pacienteRepository.update('p1', { nome: 'Updated Name' });

            expect(result).toEqual(updated);
            expect(mockPrisma.paciente.update).toHaveBeenCalledWith({
                where: { id: 'p1' },
                data: { nome: 'Updated Name' },
            });
        });
    });

    // ---------- delete ----------
    describe('delete', () => {
        it('calls prisma.paciente.delete with correct where', async () => {
            const deleted = { id: 'p1', nome: 'Deleted' };
            mockPrisma.paciente.delete.mockResolvedValue(deleted);

            const result = await pacienteRepository.delete('p1');

            expect(result).toEqual(deleted);
            expect(mockPrisma.paciente.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
        });
    });

    // ---------- countByStatus ----------
    describe('countByStatus', () => {
        it('returns counts for total, ativo, lead, avaliacao', async () => {
            mockPrisma.paciente.count
                .mockResolvedValueOnce(100)  // total
                .mockResolvedValueOnce(40)   // ativo
                .mockResolvedValueOnce(35)   // lead
                .mockResolvedValueOnce(25);  // avaliacao

            const result = await pacienteRepository.countByStatus();

            expect(result).toEqual({ total: 100, ativo: 40, lead: 35, avaliacao: 25 });
        });

        it('calls count with correct status filters', async () => {
            mockPrisma.paciente.count.mockResolvedValue(0);

            await pacienteRepository.countByStatus();

            expect(mockPrisma.paciente.count).toHaveBeenCalledTimes(4);
            expect(mockPrisma.paciente.count).toHaveBeenNthCalledWith(1);
            expect(mockPrisma.paciente.count).toHaveBeenNthCalledWith(2, { where: { status: 'ATIVO' } });
            expect(mockPrisma.paciente.count).toHaveBeenNthCalledWith(3, { where: { status: 'LEAD' } });
            expect(mockPrisma.paciente.count).toHaveBeenNthCalledWith(4, { where: { status: 'AVALIACAO' } });
        });
    });

    // ---------- search ----------
    describe('search', () => {
        it('searches by nome and telefone with default limit', async () => {
            const results = [{ id: '1', nome: 'Test' }];
            mockPrisma.paciente.findMany.mockResolvedValue(results);

            const result = await pacienteRepository.search('Test');

            expect(result).toEqual(results);
            expect(mockPrisma.paciente.findMany).toHaveBeenCalledWith({
                where: {
                    OR: [
                        { nome: { contains: 'Test' } },
                        { telefone: { contains: 'Test' } },
                    ],
                },
                take: 10,
            });
        });

        it('respects custom limit parameter', async () => {
            mockPrisma.paciente.findMany.mockResolvedValue([]);

            await pacienteRepository.search('query', 5);

            expect(mockPrisma.paciente.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ take: 5 }),
            );
        });
    });

    // ---------- findByPhone ----------
    describe('findByPhone', () => {
        it('finds paciente by phone number', async () => {
            const fakePaciente = { id: 'p1', telefone: '11999990000' };
            mockPrisma.paciente.findUnique.mockResolvedValue(fakePaciente);

            const result = await pacienteRepository.findByPhone('11999990000');

            expect(result).toEqual(fakePaciente);
            expect(mockPrisma.paciente.findUnique).toHaveBeenCalledWith({ where: { telefone: '11999990000' } });
        });

        it('returns null when phone not found', async () => {
            mockPrisma.paciente.findUnique.mockResolvedValue(null);

            const result = await pacienteRepository.findByPhone('00000000000');

            expect(result).toBeNull();
        });
    });

    // ---------- count ----------
    describe('count', () => {
        it('counts all pacientes when no where clause given', async () => {
            mockPrisma.paciente.count.mockResolvedValue(42);

            const result = await pacienteRepository.count();

            expect(result).toBe(42);
            expect(mockPrisma.paciente.count).toHaveBeenCalledWith({ where: undefined });
        });

        it('counts pacientes with a where clause', async () => {
            mockPrisma.paciente.count.mockResolvedValue(10);

            const result = await pacienteRepository.count({ status: 'ATIVO' });

            expect(result).toBe(10);
            expect(mockPrisma.paciente.count).toHaveBeenCalledWith({ where: { status: 'ATIVO' } });
        });
    });
});
