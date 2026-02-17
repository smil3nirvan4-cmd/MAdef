import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildContratoTemplate } from '@/lib/documents/contrato-template';
import { gerarContratoPDF } from '@/lib/documents/pdf-generator';

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const orcamento = await prisma.orcamento.findUnique({
            where: { id },
            include: { paciente: true },
        });

        if (!orcamento) {
            return NextResponse.json({ success: false, error: 'Orçamento não encontrado' }, { status: 404 });
        }

        const template = buildContratoTemplate({
            orcamentoId: orcamento.id,
            pacienteNome: orcamento.paciente?.nome || 'Paciente',
            pacienteTelefone: orcamento.paciente?.telefone || '',
            pacienteCidade: orcamento.paciente?.cidade,
            pacienteBairro: orcamento.paciente?.bairro,
            tipoCuidado: orcamento.paciente?.tipo,
            valorFinal: orcamento.valorFinal,
        });

        const buffer = gerarContratoPDF(template.lines);
        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${template.fileName}"`,
            },
        });
    } catch (error) {
        console.error('[API] gerar-contrato erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao gerar contrato' }, { status: 500 });
    }
}
