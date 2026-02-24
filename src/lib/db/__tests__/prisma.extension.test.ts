import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The soft-delete extension is defined via Prisma.defineExtension which wraps
 * query callbacks. Instead of trying to run Prisma, we extract the callback
 * functions from the extension definition and test them in isolation by
 * simulating the { model, args, query } parameters that Prisma passes in.
 *
 * Prisma.defineExtension is essentially the identity function — it returns
 * the config object as-is. This lets us access the query callbacks directly.
 */

// We need to mock Prisma.getExtensionContext for the delete/deleteMany handlers
const mockUpdate = vi.fn();
const mockUpdateMany = vi.fn();

vi.mock('@prisma/client', () => ({
    Prisma: {
        defineExtension: (config: any) => config,
        getExtensionContext: () => ({
            cuidador: { update: mockUpdate, updateMany: mockUpdateMany },
            paciente: { update: mockUpdate, updateMany: mockUpdateMany },
            avaliacao: { update: mockUpdate, updateMany: mockUpdateMany },
            orcamento: { update: mockUpdate, updateMany: mockUpdateMany },
            alocacao: { update: mockUpdate, updateMany: mockUpdateMany },
        }),
    },
}));

import { softDeleteExtension } from '../soft-delete.extension';

// Extract the query handlers from the extension config
const handlers = (softDeleteExtension as any).query.$allModels;

describe('soft-delete extension', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ============================================================
    // findMany
    // ============================================================
    describe('findMany', () => {
        it('adds deletedAt: null filter for soft-delete model (Cuidador)', async () => {
            const query = vi.fn(async (args: any) => []);
            const args = { where: { status: 'ATIVO' } };

            await handlers.findMany({ model: 'Cuidador', args, query });

            expect(args.where).toEqual({ status: 'ATIVO', deletedAt: null });
            expect(query).toHaveBeenCalledWith(args);
        });

        it('adds deletedAt: null filter for Paciente', async () => {
            const query = vi.fn(async (args: any) => []);
            const args = { where: { prioridade: 'ALTA' } };

            await handlers.findMany({ model: 'Paciente', args, query });

            expect(args.where).toEqual({ prioridade: 'ALTA', deletedAt: null });
        });

        it('adds deletedAt: null filter for Avaliacao', async () => {
            const query = vi.fn(async (args: any) => []);
            const args = { where: {} };

            await handlers.findMany({ model: 'Avaliacao', args, query });

            expect(args.where).toEqual({ deletedAt: null });
        });

        it('adds deletedAt: null filter for Orcamento', async () => {
            const query = vi.fn(async (args: any) => []);
            const args = { where: {} };

            await handlers.findMany({ model: 'Orcamento', args, query });

            expect(args.where).toEqual({ deletedAt: null });
        });

        it('adds deletedAt: null filter for Alocacao', async () => {
            const query = vi.fn(async (args: any) => []);
            const args = { where: {} };

            await handlers.findMany({ model: 'Alocacao', args, query });

            expect(args.where).toEqual({ deletedAt: null });
        });

        it('does NOT add filter for non-soft-delete model (Mensagem)', async () => {
            const query = vi.fn(async (args: any) => []);
            const args = { where: { telefone: '111' } };

            await handlers.findMany({ model: 'Mensagem', args, query });

            expect(args.where).toEqual({ telefone: '111' });
            expect(query).toHaveBeenCalledWith(args);
        });

        it('does NOT add filter for FormSubmission', async () => {
            const query = vi.fn(async (args: any) => []);
            const args = { where: {} };

            await handlers.findMany({ model: 'FormSubmission', args, query });

            expect(args.where).toEqual({});
        });

        it('handles undefined where by creating new where with deletedAt', async () => {
            const query = vi.fn(async (args: any) => []);
            const args = { where: undefined } as any;

            await handlers.findMany({ model: 'Cuidador', args, query });

            expect(args.where).toEqual({ deletedAt: null });
        });

        it('returns the query result', async () => {
            const expected = [{ id: '1', nome: 'Test' }];
            const query = vi.fn(async () => expected);
            const args = { where: {} };

            const result = await handlers.findMany({ model: 'Cuidador', args, query });

            expect(result).toBe(expected);
        });
    });

    // ============================================================
    // findFirst
    // ============================================================
    describe('findFirst', () => {
        it('adds deletedAt: null filter for soft-delete model', async () => {
            const query = vi.fn(async (args: any) => null);
            const args = { where: { nome: 'X' } };

            await handlers.findFirst({ model: 'Paciente', args, query });

            expect(args.where).toEqual({ nome: 'X', deletedAt: null });
            expect(query).toHaveBeenCalledWith(args);
        });

        it('does NOT add filter for non-soft-delete model', async () => {
            const query = vi.fn(async (args: any) => null);
            const args = { where: { tipo: 'CHECKIN' } };

            await handlers.findFirst({ model: 'FormSubmission', args, query });

            expect(args.where).toEqual({ tipo: 'CHECKIN' });
        });

        it('returns the query result', async () => {
            const expected = { id: '1', nome: 'First' };
            const query = vi.fn(async () => expected);
            const args = { where: {} };

            const result = await handlers.findFirst({ model: 'Cuidador', args, query });

            expect(result).toBe(expected);
        });
    });

    // ============================================================
    // findUnique
    // ============================================================
    describe('findUnique', () => {
        it('returns record when deletedAt is null for soft-delete model', async () => {
            const record = { id: '1', nome: 'Test', deletedAt: null };
            const query = vi.fn(async () => record);
            const args = { where: { id: '1' } };

            const result = await handlers.findUnique({ model: 'Cuidador', args, query });

            expect(result).toBe(record);
        });

        it('returns record when deletedAt is undefined for soft-delete model', async () => {
            const record = { id: '1', nome: 'Test' };
            const query = vi.fn(async () => record);
            const args = { where: { id: '1' } };

            const result = await handlers.findUnique({ model: 'Cuidador', args, query });

            expect(result).toBe(record);
        });

        it('returns null when record has deletedAt set for soft-delete model', async () => {
            const record = { id: '1', nome: 'Deleted', deletedAt: new Date() };
            const query = vi.fn(async () => record);
            const args = { where: { id: '1' } };

            const result = await handlers.findUnique({ model: 'Cuidador', args, query });

            expect(result).toBeNull();
        });

        it('returns null when query returns null', async () => {
            const query = vi.fn(async () => null);
            const args = { where: { id: 'missing' } };

            const result = await handlers.findUnique({ model: 'Paciente', args, query });

            expect(result).toBeNull();
        });

        it('returns record as-is for non-soft-delete model even with deletedAt set', async () => {
            const record = { id: '1', deletedAt: new Date() };
            const query = vi.fn(async () => record);
            const args = { where: { id: '1' } };

            const result = await handlers.findUnique({ model: 'Mensagem', args, query });

            expect(result).toBe(record);
        });

        it('passes args through to query unchanged for soft-delete models', async () => {
            const query = vi.fn(async () => ({ id: '1', deletedAt: null }));
            const args = { where: { id: '1' }, include: { alocacoes: true } };

            await handlers.findUnique({ model: 'Paciente', args, query });

            expect(query).toHaveBeenCalledWith(args);
        });
    });

    // ============================================================
    // delete (soft-delete transformation)
    // ============================================================
    describe('delete', () => {
        it('transforms delete into update with deletedAt for Cuidador', async () => {
            const query = vi.fn();
            const args = { where: { id: 'c1' } };
            const expectedResult = { id: 'c1', deletedAt: expect.any(Date) };
            mockUpdate.mockResolvedValue(expectedResult);

            const result = await handlers.delete.call({}, { model: 'Cuidador', args, query });

            expect(mockUpdate).toHaveBeenCalledWith({
                where: { id: 'c1' },
                data: { deletedAt: expect.any(Date) },
            });
            expect(query).not.toHaveBeenCalled();
            expect(result).toEqual(expectedResult);
        });

        it('transforms delete into update with deletedAt for Paciente', async () => {
            const query = vi.fn();
            const args = { where: { id: 'p1' } };
            mockUpdate.mockResolvedValue({ id: 'p1' });

            await handlers.delete.call({}, { model: 'Paciente', args, query });

            expect(mockUpdate).toHaveBeenCalled();
            expect(query).not.toHaveBeenCalled();
        });

        it('calls original query for non-soft-delete model', async () => {
            const query = vi.fn(async () => ({ id: 'm1' }));
            const args = { where: { id: 'm1' } };

            const result = await handlers.delete.call({}, { model: 'Mensagem', args, query });

            expect(query).toHaveBeenCalledWith(args);
            expect(mockUpdate).not.toHaveBeenCalled();
        });

        it('uses lowercase model name for context access', async () => {
            const query = vi.fn();
            const args = { where: { id: 'a1' } };
            mockUpdate.mockResolvedValue({ id: 'a1' });

            // Orcamento -> orcamento (first char lowercase)
            await handlers.delete.call({}, { model: 'Orcamento', args, query });

            // The mock is shared, so just verify it was called
            expect(mockUpdate).toHaveBeenCalled();
        });
    });

    // ============================================================
    // deleteMany (soft-delete transformation)
    // ============================================================
    describe('deleteMany', () => {
        it('transforms deleteMany into updateMany with deletedAt for Alocacao', async () => {
            const query = vi.fn();
            const args = { where: { cuidadorId: 'c1' } };
            const expectedResult = { count: 3 };
            mockUpdateMany.mockResolvedValue(expectedResult);

            const result = await handlers.deleteMany.call({}, { model: 'Alocacao', args, query });

            expect(mockUpdateMany).toHaveBeenCalledWith({
                where: { cuidadorId: 'c1' },
                data: { deletedAt: expect.any(Date) },
            });
            expect(query).not.toHaveBeenCalled();
            expect(result).toEqual(expectedResult);
        });

        it('handles args with undefined where for soft-delete model', async () => {
            const query = vi.fn();
            const args = {} as any;
            mockUpdateMany.mockResolvedValue({ count: 0 });

            await handlers.deleteMany.call({}, { model: 'Avaliacao', args, query });

            expect(mockUpdateMany).toHaveBeenCalledWith({
                where: undefined,
                data: { deletedAt: expect.any(Date) },
            });
        });

        it('calls original query for non-soft-delete model', async () => {
            const query = vi.fn(async () => ({ count: 2 }));
            const args = { where: { tipo: 'CHECKIN' } };

            const result = await handlers.deleteMany.call({}, { model: 'SystemLog', args, query });

            expect(query).toHaveBeenCalledWith(args);
            expect(mockUpdateMany).not.toHaveBeenCalled();
            expect(result).toEqual({ count: 2 });
        });
    });

    // ============================================================
    // isSoftDeleteModel (tested indirectly)
    // ============================================================
    describe('model classification', () => {
        const softDeleteModels = ['Cuidador', 'Paciente', 'Avaliacao', 'Orcamento', 'Alocacao'];
        const nonSoftDeleteModels = ['Mensagem', 'FormSubmission', 'WhatsAppSession', 'SystemLog', 'AuditLog'];

        for (const model of softDeleteModels) {
            it(`classifies ${model} as soft-delete model`, async () => {
                const query = vi.fn(async (args: any) => []);
                const args = { where: {} };

                await handlers.findMany({ model, args, query });

                expect(args.where).toHaveProperty('deletedAt', null);
            });
        }

        for (const model of nonSoftDeleteModels) {
            it(`classifies ${model} as NON soft-delete model`, async () => {
                const query = vi.fn(async (args: any) => []);
                const args = { where: {} };

                await handlers.findMany({ model, args, query });

                expect(args.where).not.toHaveProperty('deletedAt');
            });
        }

        it('handles undefined model gracefully', async () => {
            const query = vi.fn(async (args: any) => []);
            const args = { where: {} };

            await handlers.findMany({ model: undefined, args, query });

            expect(args.where).not.toHaveProperty('deletedAt');
        });
    });
});
