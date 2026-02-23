export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/observability/logger';
import { buildOrcamentoPDFData } from '@/lib/documents/build-pdf-data';
import { generatePropostaPDF } from '@/lib/documents/pdf-generator';
import { parseOrcamentoSendOptions } from '@/lib/documents/send-options';
import { guardCapability } from '@/lib/auth/capability-guard';
import { parseBody } from '@/lib/api/parse-body';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';

const gerarPropostaSchema = z.object({}).passthrough();

async function handlePost(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const guard = await guardCapability('MANAGE_ORCAMENTOS');
        if (guard instanceof NextResponse) return guard;

        const { data: body, error } = await parseBody(request, gerarPropostaSchema);
        if (error) return error;
        let sendOptions;
        try {
            sendOptions = parseOrcamentoSendOptions(body);
        } catch (error) {
            return NextResponse.json({
                success: false,
                error: error instanceof Error ? error.message : 'Opcoes de preview invalidas',
            }, { status: 400 });
        }

        const { id } = await params;
        const orcamento = await prisma.orcamento.findUnique({
            where: { id },
            include: { paciente: true },
        });

        if (!orcamento) {
            return NextResponse.json({ success: false, error: 'Orcamento nao encontrado' }, { status: 404 });
        }

        const avaliacao = await prisma.avaliacao.findFirst({
            where: { pacienteId: orcamento.pacienteId },
            include: { paciente: true },
            orderBy: { createdAt: 'desc' },
        });

        const pdfData = buildOrcamentoPDFData(
            avaliacao as unknown as Record<string, unknown> | null,
            orcamento as unknown as Record<string, unknown>,
            'PROPOSTA',
            sendOptions,
        );
        const buffer = await generatePropostaPDF(pdfData);
        const safeReference = pdfData.referencia.replace(/[^A-Za-z0-9_-]/g, '_');
        const fileName = `Proposta_${safeReference}_MaosAmigas.pdf`;

        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${fileName}"`,
            },
        });
    } catch (error) {
        await logger.error('gerar_proposta_error', 'Erro ao gerar proposta', error instanceof Error ? error : undefined);
        return NextResponse.json({ success: false, error: 'Erro ao gerar proposta' }, { status: 500 });
    }
}

export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 10, windowMs: 60_000 });

