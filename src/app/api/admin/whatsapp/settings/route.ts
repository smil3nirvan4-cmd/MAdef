import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/observability/logger';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { parseBody } from '@/lib/api/parse-body';

const updateSettingsSchema = z.record(z.string(), z.unknown());

const DEFAULT_SETTINGS: Record<string, string> = {
    autoReplyEnabled: 'true',
    autoTriagemCuidador: 'true',
    autoTriagemPaciente: 'true',
    workingHoursOnly: 'false',
    workingHoursStart: '08:00',
    workingHoursEnd: '18:00',
    maxMessagesPerMinute: '20',
    cooldownSeconds: '3',
    welcomeMessage: 'Ola! Bem-vindo a Maos Amigas. Como posso ajudar?',
    awayMessage: 'Estamos fora do horario de atendimento. Retornaremos em breve!',
    fallbackMessage: 'Desculpe, nao entendi. Digite MENU para ver as opcoes.',
    webhookSecret: process.env.WHATSAPP_WEBHOOK_SECRET || '',
};

function parseSettingValue(raw: string): any {
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    if (/^\d+$/.test(raw)) return Number(raw);
    return raw;
}

async function ensureSeed() {
    const total = await prisma.whatsAppSetting.count();
    if (total > 0) return;

    await prisma.whatsAppSetting.createMany({
        data: Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({ key, value })),
    });
}

async function loadSettingsObject() {
    const rows = await prisma.whatsAppSetting.findMany();
    const settings: Record<string, any> = {};

    for (const row of rows) {
        settings[row.key] = parseSettingValue(row.value);
    }

    return settings;
}

async function handleGet(_request: NextRequest) {
    const guard = await guardCapability('VIEW_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    await ensureSeed();
    const settings = await loadSettingsObject();

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stats = {
        messagesIn24h: await prisma.mensagem.count({ where: { timestamp: { gte: last24h }, direcao: 'IN' } }),
        messagesOut24h: await prisma.mensagem.count({ where: { timestamp: { gte: last24h }, direcao: 'OUT' } }),
        activeFlows: await prisma.whatsAppFlowState.count({ where: { currentFlow: { not: 'IDLE' } } }),
        cooldowns: await prisma.whatsAppCooldown.count(),
    };

    return NextResponse.json({ success: true, settings, stats });
}

async function handlePatch(request: NextRequest) {
    const guard = await guardCapability('MANAGE_SETTINGS');
    if (guard instanceof NextResponse) return guard;

    const { data: body, error: parseError } = await parseBody(request, updateSettingsSchema);
    if (parseError) return parseError;
    const entries = Object.entries(body);

    if (entries.length === 0) {
        return NextResponse.json({ success: false, error: 'Nenhuma configuracao recebida' }, { status: 400 });
    }

    await prisma.$transaction(
        entries.map(([key, value]) =>
            prisma.whatsAppSetting.upsert({
                where: { key },
                update: { value: String(value) },
                create: { key, value: String(value) },
            })
        )
    );

    const settings = await loadSettingsObject();

    await prisma.systemLog.create({
        data: {
            type: 'INFO',
            action: 'automation_settings_updated',
            message: 'Configuracoes de automacao atualizadas',
            metadata: JSON.stringify(body),
        },
    });

    return NextResponse.json({ success: true, settings });
}

async function handlePut(request: NextRequest) {
    const guard = await guardCapability('MANAGE_SETTINGS');
    if (guard instanceof NextResponse) return guard;

    return handlePatch(request);
}

export const GET = withRateLimit(withErrorBoundary(handleGet), { max: 30, windowMs: 60_000 });
export const PATCH = withRateLimit(withErrorBoundary(handlePatch), { max: 10, windowMs: 60_000 });
export const PUT = withRateLimit(withErrorBoundary(handlePut), { max: 10, windowMs: 60_000 });
