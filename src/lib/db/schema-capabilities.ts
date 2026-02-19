import { prisma } from '@/lib/prisma';
import {
    type DatabaseProvider,
    resolveDatabaseTargetInfo,
} from '@/lib/db/database-target';

interface RequiredColumnRef {
    table: string;
    column: string;
}

const REQUIRED_COLUMNS: RequiredColumnRef[] = [
    { table: 'Orcamento', column: 'auditHash' },
    { table: 'Orcamento', column: 'createdBy' },
    { table: 'UnidadeConfiguracaoVersao', column: 'effectiveFrom' },
    { table: 'UnidadeConfiguracaoVersao', column: 'effectiveTo' },
    { table: 'OrcamentoAuditLog', column: 'id' },
];

const DEV_CACHE_TTL_MS = 15_000;
const PROD_CACHE_TTL_MS = 60_000;

export interface DbSchemaCapabilities {
    dbSchemaOk: boolean;
    missingColumns: string[];
    databaseProvider: DatabaseProvider;
    databaseTarget: string;
    checkedAt: string;
}

interface CacheState {
    expiresAt: number;
    value: DbSchemaCapabilities;
}

let cacheState: CacheState | null = null;

function cacheTtlMs(): number {
    return process.env.NODE_ENV === 'development' ? DEV_CACHE_TTL_MS : PROD_CACHE_TTL_MS;
}

function buildQualifiedName(table: string, column: string): string {
    return `${table}.${column}`;
}

function mapColumnsByTable(required: RequiredColumnRef[]): Map<string, Set<string>> {
    const grouped = new Map<string, Set<string>>();
    for (const ref of required) {
        const existing = grouped.get(ref.table);
        if (existing) {
            existing.add(ref.column);
            continue;
        }
        grouped.set(ref.table, new Set<string>([ref.column]));
    }
    return grouped;
}

async function getSqliteColumnsForTable(table: string): Promise<Set<string>> {
    const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
        `PRAGMA table_info("${table}")`,
    );
    return new Set(rows.map((row) => String(row.name)));
}

async function getPostgresColumnsForTable(table: string): Promise<Set<string>> {
    const rows = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
        `
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = $1
        `,
        table,
    );
    return new Set(rows.map((row) => String(row.column_name)));
}

async function getColumnsForTable(provider: DatabaseProvider, table: string): Promise<Set<string>> {
    if (provider === 'postgresql') {
        return getPostgresColumnsForTable(table);
    }
    if (provider === 'sqlite') {
        return getSqliteColumnsForTable(table);
    }
    return new Set<string>();
}

async function computeCapabilities(): Promise<DbSchemaCapabilities> {
    const dbInfo = resolveDatabaseTargetInfo(process.env.DATABASE_URL);
    const provider = dbInfo.provider;
    const requiredByTable = mapColumnsByTable(REQUIRED_COLUMNS);
    const missingColumns: string[] = [];

    for (const [table, requiredColumns] of requiredByTable.entries()) {
        const columns = await getColumnsForTable(provider, table);
        for (const column of requiredColumns) {
            if (!columns.has(column)) {
                missingColumns.push(buildQualifiedName(table, column));
            }
        }
    }

    return {
        dbSchemaOk: missingColumns.length === 0,
        missingColumns,
        databaseProvider: provider,
        databaseTarget: dbInfo.target,
        checkedAt: new Date().toISOString(),
    };
}

export async function getDbSchemaCapabilities(options?: {
    forceRefresh?: boolean;
}): Promise<DbSchemaCapabilities> {
    const forceRefresh = Boolean(options?.forceRefresh);
    const now = Date.now();

    if (!forceRefresh && cacheState && cacheState.expiresAt > now) {
        return cacheState.value;
    }

    const value = await computeCapabilities();
    cacheState = {
        value,
        expiresAt: now + cacheTtlMs(),
    };
    return value;
}
