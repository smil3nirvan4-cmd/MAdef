import path from 'node:path';
import { existsSync } from 'node:fs';

export type DatabaseProvider =
    | 'sqlite'
    | 'postgresql'
    | 'mysql'
    | 'sqlserver'
    | 'mongodb'
    | 'unknown';

export interface DatabaseTargetInfo {
    provider: DatabaseProvider;
    databaseUrl: string;
    safeUrl: string;
    target: string;
}

function detectProvider(databaseUrl: string): DatabaseProvider {
    const normalized = databaseUrl.trim().toLowerCase();
    if (normalized.startsWith('file:')) return 'sqlite';
    if (normalized.startsWith('postgresql://') || normalized.startsWith('postgres://')) return 'postgresql';
    if (normalized.startsWith('mysql://')) return 'mysql';
    if (normalized.startsWith('sqlserver://')) return 'sqlserver';
    if (normalized.startsWith('mongodb://') || normalized.startsWith('mongodb+srv://')) return 'mongodb';
    return 'unknown';
}

function safeUrlFromUrl(databaseUrl: string): string {
    try {
        const parsed = new URL(databaseUrl);
        if (parsed.password) parsed.password = '***';
        if (parsed.username) parsed.username = parsed.username;
        return parsed.toString();
    } catch {
        return databaseUrl;
    }
}

function resolveSqliteTarget(databaseUrl: string): string {
    const rawPath = databaseUrl.slice('file:'.length).trim();
    if (!rawPath || rawPath === ':memory:') {
        return ':memory:';
    }

    if (path.isAbsolute(rawPath)) {
        return rawPath;
    }

    const normalizedRelative = rawPath.replace(/^\.?[\\/]/, '');
    const candidates = [
        path.resolve(process.cwd(), 'prisma', normalizedRelative),
        path.resolve(process.cwd(), normalizedRelative),
    ];

    const existingCandidate = candidates.find((candidate) => existsSync(candidate));
    return existingCandidate || candidates[0];
}

function resolveTarget(provider: DatabaseProvider, databaseUrl: string): string {
    if (provider === 'sqlite') {
        return resolveSqliteTarget(databaseUrl);
    }

    try {
        const parsed = new URL(databaseUrl);
        const dbName = parsed.pathname.replace(/^\//, '') || '-';
        return `${parsed.hostname}:${parsed.port || '-'} / ${dbName}`;
    } catch {
        return databaseUrl;
    }
}

export function resolveDatabaseTargetInfo(databaseUrlInput: string | undefined): DatabaseTargetInfo {
    const databaseUrl = String(databaseUrlInput || '').trim();
    if (!databaseUrl) {
        return {
            provider: 'unknown',
            databaseUrl: '',
            safeUrl: '',
            target: 'DATABASE_URL nao definido',
        };
    }

    const provider = detectProvider(databaseUrl);
    const safeUrl = provider === 'sqlite' ? databaseUrl : safeUrlFromUrl(databaseUrl);
    const target = resolveTarget(provider, databaseUrl);

    return {
        provider,
        databaseUrl,
        safeUrl,
        target,
    };
}
