import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeChanges, logAudit } from '../index';

vi.mock('@/lib/prisma', () => ({
    prisma: {
        systemLog: {
            create: vi.fn().mockResolvedValue({ id: 'log-1' }),
        },
    },
}));

describe('audit service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('computeChanges', () => {
        it('detects changed fields', () => {
            const before = { nome: 'Ana', status: 'LEAD', cidade: 'SP' };
            const after = { nome: 'Ana', status: 'ATIVO', cidade: 'SP' };
            const changes = computeChanges(before, after);
            expect(changes).toEqual({
                status: { from: 'LEAD', to: 'ATIVO' },
            });
        });

        it('detects added fields', () => {
            const before = { nome: 'Ana' };
            const after = { nome: 'Ana', cidade: 'RJ' };
            const changes = computeChanges(before, after);
            expect(changes).toEqual({
                cidade: { from: undefined, to: 'RJ' },
            });
        });

        it('detects removed fields', () => {
            const before = { nome: 'Ana', cidade: 'SP' };
            const after = { nome: 'Ana' };
            const changes = computeChanges(before, after);
            expect(changes).toEqual({
                cidade: { from: 'SP', to: undefined },
            });
        });

        it('returns empty for identical objects', () => {
            const obj = { nome: 'Ana', status: 'LEAD' };
            const changes = computeChanges(obj, obj);
            expect(changes).toEqual({});
        });
    });

    describe('logAudit', () => {
        it('creates a SystemLog entry for CREATE action', async () => {
            const { prisma } = await import('@/lib/prisma');

            await logAudit({
                entity: 'Paciente',
                entityId: 'p1',
                action: 'CREATE',
                after: { id: 'p1', nome: 'Ana' },
            });

            expect(prisma.systemLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    type: 'INFO',
                    action: 'paciente_create',
                    message: 'CREATE Paciente id=p1',
                }),
            });
        });

        it('creates a SystemLog entry for UPDATE with changes', async () => {
            const { prisma } = await import('@/lib/prisma');

            await logAudit({
                entity: 'Cuidador',
                entityId: 'c1',
                action: 'UPDATE',
                before: { id: 'c1', status: 'CRIADO' },
                after: { id: 'c1', status: 'ATIVO' },
            });

            expect(prisma.systemLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    type: 'INFO',
                    action: 'cuidador_update',
                    message: 'UPDATE Cuidador id=c1',
                }),
            });

            const call = (prisma.systemLog.create as any).mock.calls[0][0];
            const metadata = JSON.parse(call.data.metadata);
            expect(metadata.changes.status).toEqual({ from: 'CRIADO', to: 'ATIVO' });
        });

        it('does not throw when prisma fails', async () => {
            const { prisma } = await import('@/lib/prisma');
            (prisma.systemLog.create as any).mockRejectedValueOnce(new Error('DB down'));

            await expect(
                logAudit({
                    entity: 'Paciente',
                    entityId: 'p1',
                    action: 'CREATE',
                    after: { id: 'p1' },
                })
            ).resolves.toBeUndefined();
        });
    });
});
