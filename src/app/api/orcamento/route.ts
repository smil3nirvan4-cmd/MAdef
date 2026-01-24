import { NextRequest, NextResponse } from 'next/server';
import { calcularOrcamento, type OrcamentoInput } from '@/lib/pricing/calculator';
import { z, ZodError } from 'zod';

const OrcamentoSchema = z.object({
    tipoProfissional: z.enum(['CUIDADOR', 'AUXILIAR_ENF', 'TECNICO_ENF']),
    complexidade: z.enum(['BAIXA', 'MEDIA', 'ALTA']),
    horasDiarias: z.number().min(6).max(24),
    duracaoDias: z.number().min(1).max(365),
    incluirNoturno: z.boolean().optional(),
    feriados: z.number().min(0).optional(),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const input = OrcamentoSchema.parse(body) as OrcamentoInput;

        const orcamento = calcularOrcamento(input);

        return NextResponse.json({
            success: true,
            data: orcamento,
        });
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json(
                { success: false, error: 'Dados inválidos', details: error.issues },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'Erro ao calcular orçamento' },
            { status: 500 }
        );
    }
}
