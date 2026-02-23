import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/observability/logger';
import { guardCapability } from '@/lib/auth/capability-guard';

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

export async function GET(_request: NextRequest) {
    try {
        const guard = await guardCapability('VIEW_WHATSAPP');
        if (guard instanceof NextResponse) return guard;

        await ensureSeed();
        const rules = await prisma.whatsAppAutoReply.findMany({
            orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
        });

        return NextResponse.json({
            success: true,
            rules: rules.map(toClientRule),
            triggerTypes: TRIGGER_TYPES,
        });
    } catch (error) {
        await logger.error('autoreplies_get_error', 'Erro ao listar auto-respostas', error instanceof Error ? error : undefined);
        return NextResponse.json({ success: false, error: 'Erro ao listar auto-respostas' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const guard = await guardCapability('MANAGE_WHATSAPP');
        if (guard instanceof NextResponse) return guard;

        const body = await request.json();
        const { trigger, triggerType, response, priority } = body || {};

        if (!trigger || !response) {
            return NextResponse.json({ success: false, error: 'trigger e response são obrigatórios' }, { status: 400 });
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

        return NextResponse.json({ success: true, rule: toClientRule(rule) });
    } catch (error) {
        await logger.error('autoreplies_post_error', 'Erro ao criar auto-resposta', error instanceof Error ? error : undefined);
        return NextResponse.json({ success: false, error: 'Erro ao criar auto-resposta' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const guard = await guardCapability('MANAGE_WHATSAPP');
        if (guard instanceof NextResponse) return guard;

        const body = await request.json();
        const { id, ...updates } = body || {};

        if (!id) {
            return NextResponse.json({ success: false, error: 'id é obrigatório' }, { status: 400 });
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

        return NextResponse.json({ success: true, rule: toClientRule(rule) });
    } catch (error) {
        await logger.error('autoreplies_patch_error', 'Erro ao atualizar auto-resposta', error instanceof Error ? error : undefined);
        return NextResponse.json({ success: false, error: 'Erro ao atualizar auto-resposta' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const guard = await guardCapability('MANAGE_WHATSAPP');
        if (guard instanceof NextResponse) return guard;

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ success: false, error: 'id é obrigatório' }, { status: 400 });
        }

        await prisma.whatsAppAutoReply.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        await logger.error('autoreplies_delete_error', 'Erro ao excluir auto-resposta', error instanceof Error ? error : undefined);
        return NextResponse.json({ success: false, error: 'Erro ao excluir auto-resposta' }, { status: 500 });
    }
}
