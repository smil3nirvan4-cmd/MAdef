export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildOrcamentoPDFData } from '@/lib/documents/build-pdf-data';
import { generateContratoPDF } from '@/lib/documents/pdf-generator';
import { parseOrcamentoSendOptions } from '@/lib/documents/send-options';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { guardCapability } from '@/lib/auth/capability-guard';

async function handlePost(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const guard = await guardCapability('VIEW_ORCAMENTOS');
    if (guard instanceof NextResponse) return guard;

    try {
        const body = await request.json().catch(() => ({}));
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
            'CONTRATO',
            sendOptions,
        );
        const buffer = await generateContratoPDF(pdfData);
        const safeReference = pdfData.referencia.replace(/[^A-Za-z0-9_-]/g, '_');
        const fileName = `Contrato_${safeReference}_MaosAmigas.pdf`;

        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${fileName}"`,
            },
        });
    } catch (error) {
        console.error('[API] gerar-contrato erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao gerar contrato' }, { status: 500 });
    }
}

export const POST = withErrorBoundary(handlePost);
