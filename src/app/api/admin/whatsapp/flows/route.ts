import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { parseBody } from '@/lib/api/parse-body';

const patchFlowSchema = z.object({
    phone: z.string().min(1),
    action: z.string().min(1),
});

async function handleGet() {
    try {
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

        return NextResponse.json({ flowStates, stats });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}

async function handleDelete(request: NextRequest) {
    try {
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

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Erro' }, { status: 500 });
    }
}

async function handlePatch(request: NextRequest) {
    try {
        const guard = await guardCapability('MANAGE_WHATSAPP');
        if (guard instanceof NextResponse) return guard;

        const { data, error } = await parseBody(request, patchFlowSchema);
        if (error) return error;
        const { phone, action } = data;

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

export const GET = withRateLimit(withErrorBoundary(handleGet), { max: 30, windowMs: 60_000 });
export const DELETE = withRateLimit(withErrorBoundary(handleDelete), { max: 5, windowMs: 60_000 });
export const PATCH = withRateLimit(withErrorBoundary(handlePatch), { max: 10, windowMs: 60_000 });
