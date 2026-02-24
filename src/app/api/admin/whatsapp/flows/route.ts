import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { guardCapability } from '@/lib/auth/capability-guard';

async function handleGet() {
    const guard = await guardCapability('VIEW_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    try {
        const flowStates = await prisma.whatsAppFlowState.findMany({
            orderBy: { lastInteraction: 'desc' },
            take: 100
        });

        const stats = {
            totalActive: await prisma.whatsAppFlowState.count({ where: { currentFlow: { not: 'IDLE' } } }),
            triagem: await prisma.whatsAppFlowState.count({ where: { currentFlow: 'TRIAGEM_CUIDADOR' } }),
            avaliacao: await prisma.whatsAppFlowState.count({ where: { currentFlow: 'AVALIACAO_PACIENTE' } }),
            idle: await prisma.whatsAppFlowState.count({ where: { currentFlow: 'IDLE' } }),
        };

        return NextResponse.json({ flowStates, stats });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}

async function handleDelete(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    try {
        const { searchParams } = new URL(request.url);
        const phone = searchParams.get('phone');

        if (phone) {
            await prisma.whatsAppFlowState.delete({ where: { phone } });
        } else {
            // Clear all idle states
            await prisma.whatsAppFlowState.deleteMany({ where: { currentFlow: 'IDLE' } });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}

async function handlePatch(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    try {
        const body = await request.json();
        const { phone, action } = body;

        if (action === 'reset') {
            await prisma.whatsAppFlowState.update({
                where: { phone },
                data: { currentFlow: 'IDLE', currentStep: '', data: '{}' }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}

export const GET = withErrorBoundary(handleGet);
export const DELETE = withErrorBoundary(handleDelete);
export const PATCH = withErrorBoundary(handlePatch);
