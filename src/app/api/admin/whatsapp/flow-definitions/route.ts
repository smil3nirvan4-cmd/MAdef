import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { guardCapability } from '@/lib/auth/capability-guard';

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
    const guard = await guardCapability('VIEW_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    try {
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
        console.error('[API] flow-definitions GET erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao listar fluxos' }, { status: 500 });
    }
}

async function handlePost(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    try {
        const body = await request.json();
        const now = Date.now();
        const flow = await prisma.whatsAppFlowDefinition.create({
            data: {
                id: body?.id ? String(body.id) : `FLOW_${now}`,
                name: String(body?.name || `Fluxo ${now}`),
                description: body?.description ? String(body.description) : '',
                trigger: body?.trigger ? String(body.trigger) : '',
                category: body?.category ? String(body.category) : 'custom',
                isActive: body?.active !== false,
                definition: JSON.stringify(Array.isArray(body?.steps) ? body.steps : [{ id: 'start', type: 'message', content: 'Olá' }]),
            },
        });
        return NextResponse.json({ success: true, flow: toClientFlow(flow) });
    } catch (error) {
        console.error('[API] flow-definitions POST erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao criar fluxo' }, { status: 500 });
    }
}

async function handlePatch(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    try {
        const body = await request.json();
        const id = body?.id ? String(body.id) : '';
        if (!id) {
            return NextResponse.json({ success: false, error: 'id é obrigatório' }, { status: 400 });
        }

        const flow = await prisma.whatsAppFlowDefinition.update({
            where: { id },
            data: {
                ...(body.name !== undefined && { name: String(body.name) }),
                ...(body.description !== undefined && { description: String(body.description) }),
                ...(body.trigger !== undefined && { trigger: String(body.trigger) }),
                ...(body.category !== undefined && { category: String(body.category) }),
                ...(body.active !== undefined && { isActive: Boolean(body.active) }),
                ...(body.steps !== undefined && { definition: JSON.stringify(Array.isArray(body.steps) ? body.steps : []) }),
            },
        });

        return NextResponse.json({ success: true, flow: toClientFlow(flow) });
    } catch (error) {
        console.error('[API] flow-definitions PATCH erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao atualizar fluxo' }, { status: 500 });
    }
}

async function handleDelete(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return NextResponse.json({ success: false, error: 'id é obrigatório' }, { status: 400 });
        }

        await prisma.whatsAppFlowDefinition.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API] flow-definitions DELETE erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao excluir fluxo' }, { status: 500 });
    }
}

export const GET = withErrorBoundary(handleGet);
export const POST = withErrorBoundary(handlePost);
export const PATCH = withErrorBoundary(handlePatch);
export const DELETE = withErrorBoundary(handleDelete);
