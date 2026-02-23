import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/observability/logger';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { parseBody } from '@/lib/api/parse-body';

const createFlowDefinitionSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
    trigger: z.string().optional(),
    category: z.string().optional(),
    active: z.boolean().optional(),
    steps: z.array(z.record(z.string(), z.unknown())).optional(),
});

const updateFlowDefinitionSchema = z.object({
    id: z.string().min(1),
    name: z.string().optional(),
    description: z.string().optional(),
    trigger: z.string().optional(),
    category: z.string().optional(),
    active: z.boolean().optional(),
    steps: z.array(z.record(z.string(), z.unknown())).optional(),
});

const STEP_TYPES = ['message', 'question', 'buttons', 'list', 'media', 'condition', 'action', 'delay'];
const MEDIA_TYPES = ['image', 'video', 'audio', 'document'];
const ACTION_TYPES = ['update_cuidador', 'update_paciente', 'update_allocation', 'notify_admin', 'send_email', 'create_task'];

const DEFAULT_FLOWS = [
    {
        id: 'TRIAGEM_CUIDADOR',
        name: 'Triagem de Cuidador',
        description: 'Fluxo de triagem para novos cuidadores',
        trigger: '1|cuidador|quero trabalhar',
        category: 'recrutamento',
        active: true,
        steps: [
            { id: 'welcome', type: 'message', content: 'Olá! Seja bem-vindo ao processo seletivo da Mãos Amigas! 👋', nextStep: 'ask_name' },
            { id: 'ask_name', type: 'question', content: 'Qual é o seu nome completo?', variable: 'nome', nextStep: 'ask_area' },
        ],
    },
    {
        id: 'AVALIACAO_PACIENTE',
        name: 'Avaliação de Paciente',
        description: 'Fluxo para solicitação de cuidador',
        trigger: '2|preciso|cuidador|paciente',
        category: 'comercial',
        active: true,
        steps: [
            { id: 'welcome', type: 'message', content: 'Olá! Vamos ajudá-lo a encontrar o cuidador ideal.', nextStep: 'ask_patient' },
            { id: 'ask_patient', type: 'question', content: 'Qual o nome do paciente?', variable: 'paciente', nextStep: 'finish' },
            { id: 'finish', type: 'message', content: 'Perfeito! Nossa equipe entrará em contato em breve.' },
        ],
    },
];

function parseDefinition(value: string) {
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function toClientFlow(flow: any) {
    return {
        id: flow.id,
        name: flow.name,
        description: flow.description || '',
        trigger: flow.trigger || '',
        category: flow.category,
        active: flow.isActive,
        steps: parseDefinition(flow.definition),
        createdAt: flow.createdAt,
        updatedAt: flow.updatedAt,
    };
}

async function ensureSeed() {
    const total = await prisma.whatsAppFlowDefinition.count();
    if (total > 0) return;

    await prisma.whatsAppFlowDefinition.createMany({
        data: DEFAULT_FLOWS.map((f) => ({
            id: f.id,
            name: f.name,
            description: f.description,
            trigger: f.trigger,
            category: f.category,
            isActive: f.active,
            definition: JSON.stringify(f.steps),
        })),
    });
}

async function handleGet(request: NextRequest) {
    try {
        const guard = await guardCapability('VIEW_WHATSAPP');
        if (guard instanceof NextResponse) return guard;

        await ensureSeed();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (id) {
            const flow = await prisma.whatsAppFlowDefinition.findUnique({ where: { id } });
            if (!flow) {
                return NextResponse.json({ success: false, error: 'Fluxo não encontrado' }, { status: 404 });
            }
            return NextResponse.json({ success: true, flow: toClientFlow(flow) });
        }

        const flows = await prisma.whatsAppFlowDefinition.findMany({
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
        });
        const categories = [...new Set(flows.map((f) => f.category))];

        return NextResponse.json({
            success: true,
            flows: flows.map(toClientFlow),
            categories,
            stepTypes: STEP_TYPES,
            mediaTypes: MEDIA_TYPES,
            actionTypes: ACTION_TYPES,
        });
    } catch (error) {
        await logger.error('flow_definitions_get_error', 'Erro ao listar fluxos', error instanceof Error ? error : undefined);
        return NextResponse.json({ success: false, error: 'Erro ao listar fluxos' }, { status: 500 });
    }
}

async function handlePost(request: NextRequest) {
    try {
        const guard = await guardCapability('MANAGE_WHATSAPP');
        if (guard instanceof NextResponse) return guard;

        const { data, error } = await parseBody(request, createFlowDefinitionSchema);
        if (error) return error;
        const now = Date.now();
        const flow = await prisma.whatsAppFlowDefinition.create({
            data: {
                id: data.id ? String(data.id) : `FLOW_${now}`,
                name: String(data.name || `Fluxo ${now}`),
                description: data.description ? String(data.description) : '',
                trigger: data.trigger ? String(data.trigger) : '',
                category: data.category ? String(data.category) : 'custom',
                isActive: data.active !== false,
                definition: JSON.stringify(Array.isArray(data.steps) ? data.steps : [{ id: 'start', type: 'message', content: 'Olá' }]),
            },
        });
        return NextResponse.json({ success: true, flow: toClientFlow(flow) });
    } catch (error) {
        await logger.error('flow_definitions_post_error', 'Erro ao criar fluxo', error instanceof Error ? error : undefined);
        return NextResponse.json({ success: false, error: 'Erro ao criar fluxo' }, { status: 500 });
    }
}

async function handlePatch(request: NextRequest) {
    try {
        const guard = await guardCapability('MANAGE_WHATSAPP');
        if (guard instanceof NextResponse) return guard;

        const { data, error } = await parseBody(request, updateFlowDefinitionSchema);
        if (error) return error;
        const { id } = data;

        const flow = await prisma.whatsAppFlowDefinition.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: String(data.name) }),
                ...(data.description !== undefined && { description: String(data.description) }),
                ...(data.trigger !== undefined && { trigger: String(data.trigger) }),
                ...(data.category !== undefined && { category: String(data.category) }),
                ...(data.active !== undefined && { isActive: Boolean(data.active) }),
                ...(data.steps !== undefined && { definition: JSON.stringify(Array.isArray(data.steps) ? data.steps : []) }),
            },
        });

        return NextResponse.json({ success: true, flow: toClientFlow(flow) });
    } catch (error) {
        await logger.error('flow_definitions_patch_error', 'Erro ao atualizar fluxo', error instanceof Error ? error : undefined);
        return NextResponse.json({ success: false, error: 'Erro ao atualizar fluxo' }, { status: 500 });
    }
}

async function handleDelete(request: NextRequest) {
    try {
        const guard = await guardCapability('MANAGE_WHATSAPP');
        if (guard instanceof NextResponse) return guard;

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ success: false, error: 'id é obrigatório' }, { status: 400 });
        }

        await prisma.whatsAppFlowDefinition.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        await logger.error('flow_definitions_delete_error', 'Erro ao excluir fluxo', error instanceof Error ? error : undefined);
        return NextResponse.json({ success: false, error: 'Erro ao excluir fluxo' }, { status: 500 });
    }
}

export const GET = withRateLimit(withErrorBoundary(handleGet), { max: 30, windowMs: 60_000 });
export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 10, windowMs: 60_000 });
export const PATCH = withRateLimit(withErrorBoundary(handlePatch), { max: 10, windowMs: 60_000 });
export const DELETE = withRateLimit(withErrorBoundary(handleDelete), { max: 5, windowMs: 60_000 });
