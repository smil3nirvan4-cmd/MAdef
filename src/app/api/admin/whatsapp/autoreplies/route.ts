import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { ok, fail, E } from '@/lib/api/response';

const TRIGGER_TYPES = ['exact', 'contains', 'startsWith', 'endsWith', 'regex'];

const DEFAULT_AUTOREPLIES = [
    {
        trigger: 'oi|olá|ola|bom dia|boa tarde|boa noite',
        condition: 'regex',
        response: '🤝 *Mãos Amigas - Home Care*\n\nOlá! Como posso ajudar?\n\n1️⃣ Nossos Serviços\n2️⃣ Solicitar Orçamento\n3️⃣ Falar com Atendente\n4️⃣ Horário de Funcionamento',
        priority: 1,
    },
    {
        trigger: 'menu|inicio|início|voltar',
        condition: 'regex',
        response: '🤝 *Mãos Amigas - Home Care*\n\n1️⃣ Nossos Serviços\n2️⃣ Solicitar Orçamento\n3️⃣ Falar com Atendente\n4️⃣ Horário de Funcionamento',
        priority: 2,
    },
];

async function ensureSeed() {
    const total = await prisma.whatsAppAutoReply.count();
    if (total > 0) return;
    await prisma.whatsAppAutoReply.createMany({
        data: DEFAULT_AUTOREPLIES.map((r) => ({ ...r, isActive: true })),
    });
}

function toClientRule(rule: any) {
    return {
        id: rule.id,
        name: rule.trigger,
        trigger: rule.trigger,
        triggerType: rule.condition || 'contains',
        response: rule.response,
        active: rule.isActive,
        priority: rule.priority,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
    };
}

async function handleGet(_request: NextRequest) {
    const guard = await guardCapability('VIEW_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    await ensureSeed();
    const rules = await prisma.whatsAppAutoReply.findMany({
        orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });

    return ok({
        rules: rules.map(toClientRule),
        triggerTypes: TRIGGER_TYPES,
    });
}

async function handlePost(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const body = await request.json();
    const { trigger, triggerType, response, priority } = body || {};

    if (!trigger || !response) {
        return fail(E.VALIDATION_ERROR, 'trigger e response são obrigatórios');
    }

    const rule = await prisma.whatsAppAutoReply.create({
        data: {
            trigger: String(trigger).trim(),
            condition: TRIGGER_TYPES.includes(String(triggerType)) ? String(triggerType) : 'contains',
            response: String(response),
            priority: Number(priority || 1),
            isActive: true,
        },
    });

    return ok({ rule: toClientRule(rule) });
}

async function handlePatch(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const body = await request.json();
    const { id, ...updates } = body || {};

    if (!id) {
        return fail(E.VALIDATION_ERROR, 'id é obrigatório');
    }

    const rule = await prisma.whatsAppAutoReply.update({
        where: { id: String(id) },
        data: {
            ...(updates.trigger !== undefined && { trigger: String(updates.trigger).trim() }),
            ...(updates.triggerType !== undefined && {
                condition: TRIGGER_TYPES.includes(String(updates.triggerType)) ? String(updates.triggerType) : 'contains',
            }),
            ...(updates.response !== undefined && { response: String(updates.response) }),
            ...(updates.priority !== undefined && { priority: Number(updates.priority) }),
            ...(updates.active !== undefined && { isActive: Boolean(updates.active) }),
        },
    });

    return ok({ rule: toClientRule(rule) });
}

async function handleDelete(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
        return fail(E.VALIDATION_ERROR, 'id é obrigatório');
    }

    await prisma.whatsAppAutoReply.delete({ where: { id } });
    return ok({ deleted: true });
}

export const GET = withErrorBoundary(handleGet);
export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 20, windowSec: 60 });
export const PATCH = withRateLimit(withErrorBoundary(handlePatch), { max: 20, windowSec: 60 });
export const DELETE = withRateLimit(withErrorBoundary(handleDelete), { max: 20, windowSec: 60 });
