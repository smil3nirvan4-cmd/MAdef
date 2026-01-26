import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import whatsappSender from '@/lib/whatsapp-sender';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
    try {
        const { avaliacaoId } = await request.json();

        if (!avaliacaoId) {
            return NextResponse.json(
                { success: false, error: 'avaliacaoId é obrigatório' },
                { status: 400 }
            );
        }

        const avaliacao = await prisma.avaliacao.findUnique({
            where: { id: avaliacaoId },
            include: { paciente: true },
        });

        if (!avaliacao) {
            return NextResponse.json(
                { success: false, error: 'Avaliação não encontrada' },
                { status: 404 }
            );
        }

        await logger.info('whatsapp_reenvio', `Reenviando proposta para ${avaliacao.paciente.nome}`, {
            avaliacaoId,
            pacienteTelefone: avaliacao.paciente.telefone,
        });

        const resultado = await whatsappSender.enviarProposta({
            pacienteNome: avaliacao.paciente.nome || 'Cliente',
            pacienteTelefone: avaliacao.paciente.telefone,
            avaliacaoId: avaliacao.id,
            valorProposto: avaliacao.valorProposto || undefined,
        });

        // Atualizar avaliação
        await prisma.avaliacao.update({
            where: { id: avaliacaoId },
            data: {
                whatsappEnviado: resultado.success,
                whatsappEnviadoEm: resultado.success ? new Date() : undefined,
                whatsappMessageId: resultado.messageId || undefined,
                whatsappErro: resultado.error || null,
                whatsappTentativas: { increment: 1 },
            },
        });

        await logger.whatsapp(
            resultado.success ? 'reenvio_sucesso' : 'reenvio_falha',
            resultado.success
                ? `Proposta reenviada com sucesso para ${avaliacao.paciente.telefone}`
                : `Falha no reenvio: ${resultado.error}`,
            { avaliacaoId, resultado }
        );

        return NextResponse.json({
            success: resultado.success,
            messageId: resultado.messageId,
            error: resultado.error,
        });
    } catch (error) {
        console.error('Erro ao reenviar WhatsApp:', error);
        await logger.error('reenvio_erro', 'Erro ao reenviar proposta', error as Error);

        return NextResponse.json(
            { success: false, error: 'Erro interno ao reenviar' },
            { status: 500 }
        );
    }
}
