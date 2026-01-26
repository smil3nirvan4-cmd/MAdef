import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

// Automation settings file path
const SETTINGS_FILE = path.join(process.cwd(), '.wa-automation-settings.json');

const DEFAULT_SETTINGS = {
    autoReplyEnabled: true,
    autoTriagemCuidador: true,
    autoTriagemPaciente: true,
    workingHoursOnly: false,
    workingHoursStart: '08:00',
    workingHoursEnd: '18:00',
    maxMessagesPerMinute: 20,
    cooldownSeconds: 3,
    welcomeMessage: 'Olá! Bem-vindo à Mãos Amigas. Como posso ajudar?',
    awayMessage: 'Estamos fora do horário de atendimento. Retornaremos em breve!',
    fallbackMessage: 'Desculpe, não entendi. Digite MENU para ver as opções.',
};

function loadSettings() {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
        }
    } catch (_e) { }
    return DEFAULT_SETTINGS;
}

function saveSettings(settings: any) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

export async function GET() {
    try {
        const settings = loadSettings();

        // Get automation stats
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const stats = {
            messagesIn24h: await prisma.mensagem.count({ where: { timestamp: { gte: last24h } } }),
            messagesOut24h: await prisma.mensagem.count({ where: { timestamp: { gte: last24h }, direcao: 'OUT' } }),
            activeFlows: await prisma.whatsAppFlowState.count({ where: { currentFlow: { not: 'IDLE' } } }),
            cooldowns: await prisma.whatsAppCooldown.count(),
        };

        return NextResponse.json({ settings, stats });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const currentSettings = loadSettings();
        const newSettings = { ...currentSettings, ...body };
        saveSettings(newSettings);

        await prisma.systemLog.create({
            data: {
                type: 'INFO',
                action: 'automation_settings_updated',
                message: 'Configurações de automação atualizadas',
                metadata: JSON.stringify(body),
            }
        });

        return NextResponse.json({ success: true, settings: newSettings });
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 });
    }
}
