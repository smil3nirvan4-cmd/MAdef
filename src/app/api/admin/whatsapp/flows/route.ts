import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { ok } from '@/lib/api/response';

async function handleGet(_request: NextRequest) {
    const guard = await guardCapability('VIEW_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

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

    return ok({ flowStates, stats });
}

async function handleDelete(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (phone) {
        await prisma.whatsAppFlowState.delete({ where: { phone } });
    } else {
        // Clear all idle states
        await prisma.whatsAppFlowState.deleteMany({ where: { currentFlow: 'IDLE' } });
    }

    return ok({ deleted: true });
}

async function handlePatch(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const body = await request.json();
    const { phone, action } = body;

    if (action === 'reset') {
        await prisma.whatsAppFlowState.update({
            where: { phone },
            data: { currentFlow: 'IDLE', currentStep: '', data: '{}' }
        });
    }

    return ok({ updated: true });
}

export const GET = withErrorBoundary(handleGet);
export const DELETE = withRateLimit(withErrorBoundary(handleDelete), { max: 20, windowSec: 60 });
export const PATCH = withRateLimit(withErrorBoundary(handlePatch), { max: 20, windowSec: 60 });
