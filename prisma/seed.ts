import { Prisma } from '@prisma/client';
import { prisma } from '../src/lib/prisma';
import { ensureDefaultPricingConfig } from '../src/lib/pricing/config-service';

function isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

async function main() {
    try {
        await ensureDefaultPricingConfig();
        console.log('[seed] enterprise config default inicializada');
    } catch (error) {
        if (!isUniqueConstraintError(error)) {
            throw error;
        }
        console.warn('[seed] corrida detectada (P2002), seguindo sem falhar');
    }
}

main()
    .catch((error) => {
        console.error('[seed] falha ao executar seed', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
