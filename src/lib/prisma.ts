import { PrismaClient } from '@prisma/client';
import { resolveDatabaseTargetInfo } from '@/lib/db/database-target';

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient;
    prismaDatasourceLogged?: boolean;
};

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

if (process.env.NODE_ENV === 'development' && !globalForPrisma.prismaDatasourceLogged) {
    const info = resolveDatabaseTargetInfo(process.env.DATABASE_URL);
    console.info(`[DB] Prisma datasource provider=${info.provider} target=${info.target}`);
    globalForPrisma.prismaDatasourceLogged = true;
}
