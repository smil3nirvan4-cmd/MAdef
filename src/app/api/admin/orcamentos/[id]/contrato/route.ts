export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { guardCapability } from '@/lib/auth/capability-guard';
import { prisma } from '@/lib/prisma';
import {
    renderContract,
    validateRequiredPlaceholders,
} from '@/lib/contracts/template-engine';
import { buildContractRenderData, defaultContractTemplate } from '@/lib/contracts/render-data';
import { generateContractTextPDF } from '@/lib/documents/pdf-generator';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';
import { parseBody } from '@/lib/api/parse-body';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';

const schema = z.object({
    templateId: z.string().optional(),
    contractType: z.enum(['AVULSO', 'SEMANAL', 'MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL']).optional(),
    paymentMethod: z.string().optional(),
    dueDate: z.string().optional(),
    cancellationPolicy: z.string().optional(),
    strict: z.boolean().optional(),
    preview: z.boolean().optional(),
});

async function handlePost(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const guard = await guardCapability('MANAGE_ORCAMENTOS');
    if (guard instanceof NextResponse) return guard;

    const rate = checkRateLimit(`orcamento-contrato:${getClientIp(request)}`, 20, 60_000);
    if (!rate.allowed) {
        return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
    }

    const { data: parsed_data, error: parseError } = await parseBody(request, schema);
    if (parseError) return parseError;
    const parsed = { data: parsed_data };

    const { id } = await params;
    const orcamento = await prisma.orcamento.findUnique({
        where: { id },
        include: {
            paciente: true,
            unidade: true,
        },
    });
    if (!orcamento) {
        return NextResponse.json({ success: false, error: 'Orcamento nao encontrado' }, { status: 404 });
    }

    let template = '';
    if (parsed.data.templateId) {
        const selected = await prisma.unidadeContratoTemplate.findUnique({
            where: { id: parsed.data.templateId },
        });
        if (!selected) {
            return NextResponse.json({ success: false, error: 'Template nao encontrado' }, { status: 404 });
        }
        template = selected.conteudo;
    } else if (orcamento.unidadeId) {
        const active = await prisma.unidadeContratoTemplate.findFirst({
            where: {
                unidadeId: orcamento.unidadeId,
                tipo: 'CLIENTE',
                ativo: true,
            },
            orderBy: { versao: 'desc' },
        });
        template = active?.conteudo || '';
    }
    if (!template) {
        template = defaultContractTemplate();
    }

    const renderData = buildContractRenderData(orcamento, {
        contractType: parsed.data.contractType,
        paymentMethod: parsed.data.paymentMethod,
        dueDate: parsed.data.dueDate,
        cancellationPolicy: parsed.data.cancellationPolicy,
    });
    const rendered = renderContract(template, renderData);
    const missingRequired = validateRequiredPlaceholders(rendered.placeholders);

    if (parsed.data.strict !== false && rendered.pending.length > 0) {
        return NextResponse.json({
            success: false,
            error: 'Placeholders pendentes no contrato',
            pending: rendered.pending,
            missingRequired,
        }, { status: 422 });
    }

    if (parsed.data.preview) {
        return NextResponse.json({
            success: true,
            data: {
                content: rendered.content,
                pending: rendered.pending,
                missingRequired,
            },
        });
    }

    const pdfBuffer = await generateContractTextPDF(
        `Contrato ${orcamento.id}`,
        rendered.content,
    );

    return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Contrato_${orcamento.id}.pdf"`,
            'x-contract-pending-count': String(rendered.pending.length),
        },
    });
}

export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 10, windowMs: 60_000 });
