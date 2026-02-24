import { PrismaClient } from '@prisma/client';
import { resolveDatabaseTargetInfo } from '@/lib/db/database-target';
import { softDeleteExtension } from '@/lib/db/soft-delete.extension';

const globalForPrisma = globalThis as unknown as {
    prisma?: ReturnType<typeof createPrismaClient>;
    prismaDatasourceLogged?: boolean;
};

function createPrismaClient() {
    return new PrismaClient().$extends(softDeleteExtension);
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

if (process.env.NODE_ENV === 'development' && !globalForPrisma.prismaDatasourceLogged) {
    const info = resolveDatabaseTargetInfo(process.env.DATABASE_URL);
    console.info(`[DB] Prisma datasource provider=${info.provider} target=${info.target}`);
    globalForPrisma.prismaDatasourceLogged = true;
}
