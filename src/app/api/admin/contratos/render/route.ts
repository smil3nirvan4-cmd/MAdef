import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { guardCapability } from '@/lib/auth/capability-guard';
import { prisma } from '@/lib/prisma';
import {
    renderContract,
    validateRequiredPlaceholders,
} from '@/lib/contracts/template-engine';
import { buildContractRenderData, defaultContractTemplate } from '@/lib/contracts/render-data';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';

const renderSchema = z.object({
    templateId: z.string().optional(),
    template: z.string().optional(),
    orcamentoId: z.string().optional(),
    data: z.record(z.string(), z.unknown()).optional(),
    strict: z.boolean().optional(),
    contractType: z.string().optional(),
    paymentMethod: z.string().optional(),
    dueDate: z.string().optional(),
    cancellationPolicy: z.string().optional(),
});

async function handlePost(request: NextRequest) {
    const guard = await guardCapability('MANAGE_ORCAMENTOS');
    if (guard instanceof NextResponse) return guard;

    const body = await request.json().catch(() => ({}));
    const parsed = renderSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { success: false, error: 'Payload invalido', details: parsed.error.issues },
            { status: 400 },
        );
    }

    const data = parsed.data;
    let template = data.template || '';

    if (!template && data.templateId) {
        const tpl = await prisma.unidadeContratoTemplate.findUnique({
            where: { id: data.templateId },
        });
        if (!tpl) {
            return NextResponse.json({ success: false, error: 'Template nao encontrado' }, { status: 404 });
        }
        template = tpl.conteudo;
    }
    if (!template) {
        template = defaultContractTemplate();
    }

    let renderData: Record<string, unknown> = data.data || {};
    if (data.orcamentoId) {
        const orcamento = await prisma.orcamento.findUnique({
            where: { id: data.orcamentoId },
            include: {
                paciente: true,
                unidade: true,
            },
        });
        if (!orcamento) {
            return NextResponse.json({ success: false, error: 'Orcamento nao encontrado' }, { status: 404 });
        }
        renderData = {
            ...buildContractRenderData(orcamento, {
                contractType: data.contractType,
                paymentMethod: data.paymentMethod,
                dueDate: data.dueDate,
                cancellationPolicy: data.cancellationPolicy,
            }),
            ...(data.data || {}),
        };
    }

    const rendered = renderContract(template, renderData);
    const missingRequired = validateRequiredPlaceholders(rendered.placeholders);

    if (data.strict !== false && rendered.pending.length > 0) {
        return NextResponse.json(
            {
                success: false,
                error: 'Template possui placeholders pendentes',
                pending: rendered.pending,
                missingRequired,
            },
            { status: 422 },
        );
    }

    return NextResponse.json({
        success: true,
        data: {
            content: rendered.content,
            placeholders: rendered.placeholders,
            pending: rendered.pending,
            missingRequired,
        },
    });
}

export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 10, windowMs: 60_000 });
