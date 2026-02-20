/**
 * Limpa todos os dados transacionais de banco de dados (relacionados a WhatsApp, Avaliações, Pacientes, Cuidadores) 
 * para iniciar com um banco limpo, preservando as configurações da Unidade (Enterprise).
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Carrega .env.local manualmente para o script rodar corretamente
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const defaultEnv = fs.readFileSync(envPath, 'utf-8');
    defaultEnv.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const separatorIndex = trimmed.indexOf('=');
            if (separatorIndex > 0) {
                const key = trimmed.slice(0, separatorIndex).trim();
                let value = trimmed.slice(separatorIndex + 1).trim();
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                if (!process.env[key]) {
                    process.env[key] = value;
                }
            }
        }
    });
}

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Iniciando limpeza de dados (Testes/Triagem/WhatsApp)...');

    // WhatsApp Data
    await prisma.whatsAppMessage.deleteMany();
    await prisma.whatsAppSession.deleteMany();
    console.log(' - WhatsApp Messages e Sessions limpos');

    await prisma.whatsAppContact.deleteMany();
    await prisma.whatsAppFlowState.deleteMany();
    await prisma.whatsAppLock.deleteMany();
    await prisma.whatsAppCooldown.deleteMany();
    await prisma.whatsAppScheduled.deleteMany();
    await prisma.whatsAppQueueItem.deleteMany();
    await prisma.whatsAppAnalytics.deleteMany();
    console.log(' - Outros dados do WhatsApp limpos');

    // Core Data
    await prisma.mensagem.deleteMany();
    await prisma.alocacao.deleteMany();
    await prisma.orcamentoAuditLog.deleteMany();
    await prisma.orcamentoSimulacao.deleteMany();
    await prisma.orcamento.deleteMany();
    await prisma.avaliacao.deleteMany();
    console.log(' - Avaliações, Mensagens, Simulações e Orçamentos limpos');

    await prisma.paciente.deleteMany();
    await prisma.cuidador.deleteMany();
    await prisma.formSubmission.deleteMany();
    console.log(' - Pacientes, Cuidadores e FormSubmissions limpos');

    await prisma.systemLog.deleteMany();
    console.log(' - Logs do sistema limpos');

    console.log('✅ Banco de dados limpo com sucesso! (Configurações enterprise mantidas)');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
