
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Checking recent evaluations in dev.db...');
    const evals = await prisma.avaliacao.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { paciente: true }
    });

    if (evals.length === 0) {
        console.log('❌ No evaluations found.');
    } else {
        console.log(`✅ Found ${evals.length} evaluations:`);
        evals.forEach(e => {
            console.log(`- [${e.createdAt.toISOString()}] ID: ${e.id} | Paciente: ${e.paciente?.nome} | Phone: ${e.paciente?.telefone}`);
        });
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
