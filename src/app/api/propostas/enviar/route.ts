import { NextResponse } from 'next/server';
import { getSignatureProvider } from '@/lib/services/signature';
import { prisma } from '../../../../lib/db'; // Fresh import to bypass cache
import logger from '@/lib/logger';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            // Proposal Fields
            phone, nome, email, valorTotal, entrada, parcelas,
            valorParcela, vencimento, descontos, acrescimos,
            // Full Data
            dadosDetalhados
        } = body;

        console.log('📦 Recebendo payload completo:', { nome, phone, hasDetails: !!dadosDetalhados });

        // Validação Básica
        if (!phone || !nome) {
            throw new Error('Nome e Telefone são obrigatórios para salvar a avaliação.');
        }

        // 0. Salvar/Atualizar Paciente e Avaliação no DB
        // REMOVIDO TRY/CATCH PROPOSITADAMENTE PARA EXPOR ERROS AO FRONTEND

        // Find or Create Patient
        let paciente = await prisma.paciente.findUnique({ where: { telefone: phone } });
        if (!paciente) {
            console.log('👤 Criando novo paciente...');
            paciente = await prisma.paciente.create({
                data: {
                    nome: nome || dadosDetalhados?.patient?.nome || 'Novo Paciente',
                    telefone: phone,
                    status: 'AVALIACAO'
                }
            });
        } else {
            console.log('👤 Paciente existente encontrado:', paciente.id);
        }

        // Create Avaliacao Record
        const novaAvaliacao = await prisma.avaliacao.create({
            data: {
                pacienteId: paciente.id,
                status: 'ENVIADA',
                dadosDetalhados: JSON.stringify(dadosDetalhados || {}),
                abemidScore: 0,
                nivelSugerido: dadosDetalhados?.orcamento?.complexidade || 'N/A'
            }
        });
        console.log('✅ Avaliação salva com ID:', novaAvaliacao.id);

        // LOG: Avaliação criada com sucesso
        await logger.info('avaliacao_criada', `Nova avaliação criada para paciente ${paciente.nome}`, {
            avaliacaoId: novaAvaliacao.id,
            pacienteId: paciente.id,
            pacienteTelefone: phone,
            valorTotal,
        });

        // 1. Gerar Link de Assinatura
        const provider = getSignatureProvider();
        const signature = await provider.createEnvelope({
            title: `Proposta Comercial - ${nome}`,
            signers: [{ name: nome, email: email || 'cliente@email.com', phone }],
            metadata: { valorTotal, parcelas }
        });

        // 2. Montar Mensagem WhatsApp
        const resumoClinico = dadosDetalhados ? `
📋 *Resumo da Avaliação:*
• *Gatilho:* ${dadosDetalhados.discovery?.gatilho || 'Não informado'}
• *Complexidade:* ${dadosDetalhados.orcamento?.complexidade || 'N/A'}
• *Medicamentos:* ${dadosDetalhados.clinical?.medicamentos?.total || 'N/A'}
• *Quedas:* ${dadosDetalhados.clinical?.quedas || 'N/A'}
• *Obs:* ${dadosDetalhados.abemid?.observacoes || 'Sem observações'}
` : '';

        const mensagem = `
📄 *Proposta Comercial Mãos Amigas*

Olá, ${nome}! Foi um prazer realizar a avaliação hoje.
Com base no que conversamos, preparamos um plano personalizado.

${resumoClinico}
💰 *Investimento:* R$ ${Number(valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
(Entrada: R$ ${Number(entrada).toFixed(2)} + ${parcelas}x R$ ${Number(valorParcela).toFixed(2)})

🔗 *Clique abaixo para revisar e assinar o contrato:*
${signature.signingUrl}

⏳ *Proposta válida por 24h.*
        `.trim();

        // 3. Enviar via Bridge (Bot)
        try {
            console.log('🔄 Tentando enviar mensagem via Bridge (Porta 4000)...');
            const bridgeRes = await fetch('http://localhost:4000/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, message: mensagem })
            });

            if (!bridgeRes.ok) {
                const errText = await bridgeRes.text();
                console.error('❌ Falha na bridge do bot:', errText);
                await logger.warning('whatsapp_bridge_error', `Falha ao enviar via bridge: ${errText}`, {
                    phone,
                    avaliacaoId: novaAvaliacao.id,
                });
            } else {
                console.log('✅ Mensagem enviada para a fila do WhatsApp.');
                await logger.whatsapp('proposta_enviada', `Proposta enviada para ${phone}`, {
                    avaliacaoId: novaAvaliacao.id,
                    pacienteId: paciente.id,
                    valorTotal,
                });
            }
        } catch (_e) {
            console.error('❌ Erro CRÍTICO de conexão com Bridge (Bot Offline na porta 4000?):', _e);
            await logger.error('whatsapp_bridge_offline', 'Bridge offline na porta 4000', _e as Error, {
                phone,
                avaliacaoId: novaAvaliacao.id,
            });
            // Não falha a requisição toda, para garantir que o link de assinatura seja retornado
        }

        return NextResponse.json({ success: true, signingUrl: signature.signingUrl });

    } catch (error: any) {
        console.error('Erro fatal ao processar proposta:', error);
        await logger.error('proposta_erro_fatal', 'Erro fatal ao processar proposta', error, {
            errorMessage: error.message,
        });
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

