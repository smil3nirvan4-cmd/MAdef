import { WhatsAppMessage } from '@/types/whatsapp';
import { UserState, setUserState } from '../state-manager';
import { sendMessage } from '../client';
import { prisma } from '@/lib/db';
import logger from '@/lib/observability/logger';

/**
 * Handler para processar confirmação ou recusa de proposta
 * Acionado quando o cliente responde com "Confirmo" ou "Recuso"
 */
export async function handleConfirmacaoProposta(
    message: WhatsAppMessage,
    state: UserState
) {
    const { body, from } = message;
    const phone = from.replace('@s.whatsapp.net', '').replace('@lid', '');
    const texto = body.trim().toLowerCase();

    logger.whatsapp('proposta.resposta', `Processando resposta de ${phone}`, { module: 'confirmacao-proposta', phone, texto });

    // Verificar se é confirmação
    if (texto === 'confirmo' || texto === 'aceito' || texto === 'sim' || texto === 'ok') {
        try {
            // Atualizar status do paciente
            const paciente = await prisma.paciente.update({
                where: { telefone: phone },
                data: { status: 'PROPOSTA_ACEITA' }
            });

            logger.info('proposta.aceita', `Proposta ACEITA pelo paciente ${paciente.id}`, { module: 'confirmacao-proposta', pacienteId: paciente.id });

            await sendMessage(from, `
✅ *Proposta Confirmada!*

Obrigado por aceitar nossa proposta de cuidado.
Nossa equipe está preparando o contrato de prestação de serviços.

📄 Em breve você receberá o contrato para assinatura digital.

Se tiver dúvidas, digite *AJUDA*.
            `.trim());

            await setUserState(phone, {
                currentFlow: 'AGUARDANDO_CONTRATO',
                currentStep: 'PROPOSTA_ACEITA',
                data: {
                    ...state.data,
                    propostaAceitaEm: new Date().toISOString(),
                }
            });

        } catch (error) {
            logger.error('proposta.aceita', 'Erro ao processar confirmacao', error instanceof Error ? error : { error }, { module: 'confirmacao-proposta' });
            await sendMessage(from, 'Ocorreu um erro ao processar sua confirmação. Por favor, tente novamente ou digite AJUDA.');
        }
        return;
    }

    // Verificar se é recusa
    if (texto === 'recuso' || texto === 'não' || texto === 'nao' || texto === 'cancelar') {
        try {
            const paciente = await prisma.paciente.update({
                where: { telefone: phone },
                data: { status: 'PROPOSTA_RECUSADA' }
            });

            logger.info('proposta.recusada', `Proposta RECUSADA pelo paciente ${paciente.id}`, { module: 'confirmacao-proposta', pacienteId: paciente.id });

            await sendMessage(from, `
Entendemos sua decisão.

Se mudar de ideia ou quiser discutir outras opções, estamos à disposição.

Digite *MENU* para ver opções ou *AJUDA* para falar com um atendente.
            `.trim());

            await setUserState(phone, {
                currentFlow: 'IDLE',
                currentStep: '',
                data: {
                    ...state.data,
                    propostaRecusadaEm: new Date().toISOString(),
                }
            });

        } catch (error) {
            logger.error('proposta.recusada', 'Erro ao processar recusa', error instanceof Error ? error : { error }, { module: 'confirmacao-proposta' });
        }
        return;
    }

    // Resposta não reconhecida
    await sendMessage(from, `
Para confirmar a proposta, digite *CONFIRMO*.
Para recusar, digite *RECUSO*.

Se tiver dúvidas sobre a proposta, digite *AJUDA* para falar com um atendente.
    `.trim());
}

/**
 * Handler para processar assinatura de contrato
 * Acionado quando o cliente confirma assinatura
 */
export async function handleAssinaturaContrato(
    message: WhatsAppMessage,
    state: UserState
) {
    const { body, from } = message;
    const phone = from.replace('@s.whatsapp.net', '').replace('@lid', '');
    const texto = body.trim().toLowerCase();

    logger.whatsapp('contrato.resposta', `Processando resposta de ${phone}`, { module: 'confirmacao-proposta', phone, texto });

    if (texto === 'assinado' || texto === 'assinei' || texto === 'pronto') {
        try {
            const paciente = await prisma.paciente.update({
                where: { telefone: phone },
                data: { status: 'ATIVO' }
            });

            logger.info('contrato.ativo', `Cliente ${paciente.id} agora e ATIVO`, { module: 'confirmacao-proposta', pacienteId: paciente.id });

            await sendMessage(from, `
🎉 *Bem-vindo à família Mãos Amigas!*

Seu cadastro está ativo e nossa equipe já está trabalhando para encontrar o profissional ideal para você.

📋 *Próximos passos:*
1. Nossa coordenação entrará em contato para agendar o início do atendimento
2. Você receberá os dados do profissional selecionado
3. Poderá avaliar cada atendimento pelo WhatsApp

Digite *MENU* para ver suas opções ou *AJUDA* se precisar de algo.
            `.trim());

            await setUserState(phone, {
                currentFlow: 'CLIENTE_ATIVO',
                currentStep: 'CONTRATO_ASSINADO',
                data: {
                    ...state.data,
                    contratoAssinadoEm: new Date().toISOString(),
                }
            });

        } catch (error) {
            logger.error('contrato.ativo', 'Erro ao ativar cliente', error instanceof Error ? error : { error }, { module: 'confirmacao-proposta' });
        }
        return;
    }

    await sendMessage(from, `
Após assinar o contrato no link enviado, responda aqui com *ASSINADO* para confirmarmos.

Se tiver dúvidas, digite *AJUDA*.
    `.trim());
}
