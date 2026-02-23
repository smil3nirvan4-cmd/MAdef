import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
    cuidador: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    mensagem: {
        deleteMany: vi.fn(),
    },
    alocacao: {
        deleteMany: vi.fn(),
    },
}));

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));

import { cuidadorRepository } from './cuidador.repository';

describe('cuidadorRepository', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ---------- findAll ----------
    describe('findAll', () => {
        it('returns paginated results with defaults (page=1, pageSize=200)', async () => {
            const fakeCuidadores = [{ id: 'c1', nome: 'Joao' }];
            mockPrisma.cuidador.findMany.mockResolvedValue(fakeCuidadores);
            mockPrisma.cuidador.count.mockResolvedValue(1);

            const result = await cuidadorRepository.findAll();

            expect(result).toEqual({ data: fakeCuidadores, total: 1, page: 1, pageSize: 200 });
            expect(mockPrisma.cuidador.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ skip: 0, take: 200 }),
            );
        });

        it('applies pagination correctly for page 2, pageSize 50', async () => {
            mockPrisma.cuidador.findMany.mockResolvedValue([]);
            mockPrisma.cuidador.count.mockResolvedValue(0);

            await cuidadorRepository.findAll({ page: 2, pageSize: 50 });

            expect(mockPrisma.cuidador.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ skip: 50, take: 50 }),
            );
        });

        it('filters by status when provided', async () => {
            mockPrisma.cuidador.findMany.mockResolvedValue([]);
            mockPrisma.cuidador.count.mockResolvedValue(0);

            await cuidadorRepository.findAll({ status: 'APROVADO' });

            const callArg = mockPrisma.cuidador.findMany.mock.calls[0][0];
            expect(callArg.where).toEqual(expect.objectContaining({ status: 'APROVADO' }));
        });

        it('filters by area when provided', async () => {
            mockPrisma.cuidador.findMany.mockResolvedValue([]);
            mockPrisma.cuidador.count.mockResolvedValue(0);

            await cuidadorRepository.findAll({ area: 'ZONA_SUL' });

            const callArg = mockPrisma.cuidador.findMany.mock.calls[0][0];
            expect(callArg.where).toEqual(expect.objectContaining({ area: 'ZONA_SUL' }));
        });

        it('builds OR search across nome and telefone', async () => {
            mockPrisma.cuidador.findMany.mockResolvedValue([]);
            mockPrisma.cuidador.count.mockResolvedValue(0);

            await cuidadorRepository.findAll({ search: 'Pedro' });

            const callArg = mockPrisma.cuidador.findMany.mock.calls[0][0];
            expect(callArg.where.OR).toEqual([
                { nome: { contains: 'Pedro' } },
                { telefone: { contains: 'Pedro' } },
            ]);
        });

        it('passes empty where when no filters provided', async () => {
            mockPrisma.cuidador.findMany.mockResolvedValue([]);
            mockPrisma.cuidador.count.mockResolvedValue(0);

            await cuidadorRepository.findAll();

            const callArg = mockPrisma.cuidador.findMany.mock.calls[0][0];
            expect(callArg.where).toEqual({});
        });

        it('includes _count for mensagens and alocacoes', async () => {
            mockPrisma.cuidador.findMany.mockResolvedValue([]);
            mockPrisma.cuidador.count.mockResolvedValue(0);

            await cuidadorRepository.findAll();

            const callArg = mockPrisma.cuidador.findMany.mock.calls[0][0];
            expect(callArg.include).toEqual({
                _count: { select: { mensagens: true, alocacoes: true } },
            });
        });

        it('always orders by createdAt desc', async () => {
            mockPrisma.cuidador.findMany.mockResolvedValue([]);
            mockPrisma.cuidador.count.mockResolvedValue(0);

            await cuidadorRepository.findAll();

            const callArg = mockPrisma.cuidador.findMany.mock.calls[0][0];
            expect(callArg.orderBy).toEqual({ createdAt: 'desc' });
        });
    });

    // ---------- findById ----------
    describe('findById', () => {
        it('returns the cuidador with relations when found', async () => {
            const fakeCuidador = { id: 'c1', nome: 'Joao', mensagens: [], alocacoes: [] };
            mockPrisma.cuidador.findUnique.mockResolvedValue(fakeCuidador);

            const result = await cuidadorRepository.findById('c1');

            expect(result).toEqual(fakeCuidador);
            expect(mockPrisma.cuidador.findUnique).toHaveBeenCalledWith(
                expect.objectContaining({ where: { id: 'c1' } }),
            );
        });

        it('returns null when cuidador does not exist', async () => {
            mockPrisma.cuidador.findUnique.mockResolvedValue(null);

            const result = await cuidadorRepository.findById('non-existent');

            expect(result).toBeNull();
        });

        it('includes mensagens and alocacoes with correct ordering and limits', async () => {
            mockPrisma.cuidador.findUnique.mockResolvedValue(null);

            await cuidadorRepository.findById('c1');

            const callArg = mockPrisma.cuidador.findUnique.mock.calls[0][0];
            expect(callArg.include).toEqual({
                mensagens: { orderBy: { timestamp: 'desc' }, take: 50 },
                alocacoes: { include: { paciente: true }, orderBy: { createdAt: 'desc' }, take: 20 },
            });
        });
    });

    // ---------- findByPhone ----------
    describe('findByPhone', () => {
        it('finds cuidador by phone number', async () => {
            const fakeCuidador = { id: 'c1', telefone: '11999990000' };
            mockPrisma.cuidador.findUnique.mockResolvedValue(fakeCuidador);

            const result = await cuidadorRepository.findByPhone('11999990000');

            expect(result).toEqual(fakeCuidador);
            expect(mockPrisma.cuidador.findUnique).toHaveBeenCalledWith({ where: { telefone: '11999990000' } });
        });

        it('returns null when phone not found', async () => {
            mockPrisma.cuidador.findUnique.mockResolvedValue(null);

            const result = await cuidadorRepository.findByPhone('00000000000');

            expect(result).toBeNull();
        });
    });

    // ---------- create ----------
    describe('create', () => {
        it('calls prisma.cuidador.create with the provided data', async () => {
            const input = { nome: 'Novo Cuidador', telefone: '11999990000' };
            const created = { id: 'new-id', ...input };
            mockPrisma.cuidador.create.mockResolvedValue(created);

            const result = await cuidadorRepository.create(input as any);

            expect(result).toEqual(created);
            expect(mockPrisma.cuidador.create).toHaveBeenCalledWith({ data: input });
        });
    });

    // ---------- update ----------
    describe('update', () => {
        it('calls prisma.cuidador.update with correct where and data', async () => {
            const updated = { id: 'c1', nome: 'Updated Name' };
            mockPrisma.cuidador.update.mockResolvedValue(updated);

            const result = await cuidadorRepository.update('c1', { nome: 'Updated Name' });

            expect(result).toEqual(updated);
            expect(mockPrisma.cuidador.update).toHaveBeenCalledWith({
                where: { id: 'c1' },
                data: { nome: 'Updated Name' },
            });
        });
    });

    // ---------- delete ----------
    describe('delete', () => {
        it('deletes related mensagens and alocacoes before deleting cuidador', async () => {
            mockPrisma.mensagem.deleteMany.mockResolvedValue({ count: 5 });
            mockPrisma.alocacao.deleteMany.mockResolvedValue({ count: 2 });
            const deleted = { id: 'c1', nome: 'Deleted' };
            mockPrisma.cuidador.delete.mockResolvedValue(deleted);

            const result = await cuidadorRepository.delete('c1');

            expect(result).toEqual(deleted);
            expect(mockPrisma.mensagem.deleteMany).toHaveBeenCalledWith({ where: { cuidadorId: 'c1' } });
            expect(mockPrisma.alocacao.deleteMany).toHaveBeenCalledWith({ where: { cuidadorId: 'c1' } });
            expect(mockPrisma.cuidador.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
        });

        it('calls deletes in correct order (mensagens, alocacoes, then cuidador)', async () => {
            const callOrder: string[] = [];
            mockPrisma.mensagem.deleteMany.mockImplementation(async () => { callOrder.push('mensagem'); return { count: 0 }; });
            mockPrisma.alocacao.deleteMany.mockImplementation(async () => { callOrder.push('alocacao'); return { count: 0 }; });
            mockPrisma.cuidador.delete.mockImplementation(async () => { callOrder.push('cuidador'); return { id: 'c1' }; });

            await cuidadorRepository.delete('c1');

            expect(callOrder).toEqual(['mensagem', 'alocacao', 'cuidador']);
        });
    });

    // ---------- countByStatus ----------
    describe('countByStatus', () => {
        it('returns counts for total, aguardando, entrevista, aprovado, rejeitado', async () => {
            mockPrisma.cuidador.count
                .mockResolvedValueOnce(200)   // total
                .mockResolvedValueOnce(50)    // aguardando
                .mockResolvedValueOnce(30)    // entrevista
                .mockResolvedValueOnce(100)   // aprovado
                .mockResolvedValueOnce(20);   // rejeitado

            const result = await cuidadorRepository.countByStatus();

            expect(result).toEqual({
                total: 200,
                aguardando: 50,
                entrevista: 30,
                aprovado: 100,
                rejeitado: 20,
            });
        });

        it('calls count with correct status filters', async () => {
            mockPrisma.cuidador.count.mockResolvedValue(0);

            await cuidadorRepository.countByStatus();

            expect(mockPrisma.cuidador.count).toHaveBeenCalledTimes(5);
            expect(mockPrisma.cuidador.count).toHaveBeenNthCalledWith(1);
            expect(mockPrisma.cuidador.count).toHaveBeenNthCalledWith(2, { where: { status: 'AGUARDANDO_RH' } });
            expect(mockPrisma.cuidador.count).toHaveBeenNthCalledWith(3, { where: { status: 'EM_ENTREVISTA' } });
            expect(mockPrisma.cuidador.count).toHaveBeenNthCalledWith(4, { where: { status: 'APROVADO' } });
            expect(mockPrisma.cuidador.count).toHaveBeenNthCalledWith(5, { where: { status: 'REJEITADO' } });
        });
    });

    // ---------- count ----------
    describe('count', () => {
        it('counts all cuidadores when no where clause given', async () => {
            mockPrisma.cuidador.count.mockResolvedValue(150);

            const result = await cuidadorRepository.count();

            expect(result).toBe(150);
            expect(mockPrisma.cuidador.count).toHaveBeenCalledWith({ where: undefined });
        });

        it('counts cuidadores with a where clause', async () => {
            mockPrisma.cuidador.count.mockResolvedValue(80);

            const result = await cuidadorRepository.count({ status: 'APROVADO' });

            expect(result).toBe(80);
            expect(mockPrisma.cuidador.count).toHaveBeenCalledWith({ where: { status: 'APROVADO' } });
        });
    });
});
