import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    queryRawUnsafe: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
    prisma: {
        $queryRawUnsafe: mocks.queryRawUnsafe,
    },
}));

vi.mock('@/lib/db/database-target', () => ({
    resolveDatabaseTargetInfo: vi.fn(() => ({
        provider: 'sqlite',
        databaseUrl: 'file:./dev.db',
        safeUrl: 'file:./dev.db',
        target: 'C:/repo/prisma/dev.db',
    })),
}));

describe('getDbSchemaCapabilities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    it('returns dbSchemaOk=true when required columns exist', async () => {
        mocks.queryRawUnsafe.mockImplementation(async (query: string) => {
            if (query.includes(`PRAGMA table_info("Orcamento")`)) {
                return [{ name: 'auditHash' }, { name: 'createdBy' }];
            }
            if (query.includes(`PRAGMA table_info("UnidadeConfiguracaoVersao")`)) {
                return [{ name: 'effectiveFrom' }, { name: 'effectiveTo' }];
            }
            if (query.includes(`PRAGMA table_info("OrcamentoAuditLog")`)) {
                return [{ name: 'id' }];
            }
            return [];
        });

        const { getDbSchemaCapabilities } = await import('./schema-capabilities');
        const result = await getDbSchemaCapabilities({ forceRefresh: true });

        expect(result.dbSchemaOk).toBe(true);
        expect(result.missingColumns).toEqual([]);
        expect(result.databaseProvider).toBe('sqlite');
    });

    it('returns missing columns when schema is incomplete', async () => {
        mocks.queryRawUnsafe.mockImplementation(async (query: string) => {
            if (query.includes(`PRAGMA table_info("Orcamento")`)) {
                return [{ name: 'createdBy' }];
            }
            if (query.includes(`PRAGMA table_info("UnidadeConfiguracaoVersao")`)) {
                return [{ name: 'effectiveFrom' }];
            }
            if (query.includes(`PRAGMA table_info("OrcamentoAuditLog")`)) {
                return [];
            }
            return [];
        });

        const { getDbSchemaCapabilities } = await import('./schema-capabilities');
        const result = await getDbSchemaCapabilities({ forceRefresh: true });

        expect(result.dbSchemaOk).toBe(false);
        expect(result.missingColumns).toContain('Orcamento.auditHash');
        expect(result.missingColumns).toContain('UnidadeConfiguracaoVersao.effectiveTo');
        expect(result.missingColumns).toContain('OrcamentoAuditLog.id');
    });

    it('uses cache unless forceRefresh is enabled', async () => {
        mocks.queryRawUnsafe.mockResolvedValue([{ name: 'auditHash' }, { name: 'createdBy' }]);
        const { getDbSchemaCapabilities } = await import('./schema-capabilities');

        await getDbSchemaCapabilities({ forceRefresh: true });
        const firstCallCount = mocks.queryRawUnsafe.mock.calls.length;
        await getDbSchemaCapabilities();
        const secondCallCount = mocks.queryRawUnsafe.mock.calls.length;

        expect(firstCallCount).toBeGreaterThan(0);
        expect(secondCallCount).toBe(firstCallCount);
    });
});
