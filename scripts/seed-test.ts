
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding data...');

    const patient = await prisma.paciente.create({
        data: {
            nome: 'Maria da Silva',
            telefone: '11999999999',
            cidade: 'São Paulo',
            hospital: 'Hospital Israelita Albert Einstein',
        },
    });

    console.log('Created patient:', patient.nome);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
