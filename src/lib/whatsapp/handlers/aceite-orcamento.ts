import { assertPublicUrl } from '@/lib/config/public-url';
import { WhatsAppMessage } from '@/types/whatsapp';
import { UserState, setUserState } from '../state-manager';
import { sendMessage } from '../client';
import logger from '@/lib/observability/logger';

export async function handleAceiteOrcamento(
    message: WhatsAppMessage,
    state: UserState
) {
    const { body, from } = message;
    const { orcamentoId } = state.data;

    const input = body.toUpperCase().trim();

    if (input === 'ACEITO' || input === '1') {
        const { DB } = await import('@/lib/database');
        await DB.orcamento.update(orcamentoId, {
            status: 'ACEITO',
            aceitoEm: new Date()
        });

        // Gerar Contrato Digital via Provider
        try {
            await sendMessage(from, '🔄 Gerando contrato digital seguro... Aguarde um instante.');

            const { getSignatureProvider } = await import('@/lib/services/signature');
            const provider = getSignatureProvider();

            const result = await provider.createEnvelope({
                title: `Contrato Mãos Amigas - Orçamento #${orcamentoId || '000'}`,
                signers: [
                    {
                        name: state.data.nome || 'Cliente',
                        email: state.data.email || 'cliente@email.com',
                        phone: from.split('@')[0]
                    }
                ]
            });

            const signingUrl = assertPublicUrl(result.signingUrl, 'Link de assinatura').toString();

            await sendMessage(from, `
✍️ *Assinatura Requerida*

Para formalizar nossa parceria com segurança jurídica, precisamos que você assine o contrato digital.

🔗 *Clique no link para assinar:*
${signingUrl}

Após assinar no site, digite *JÁ ASSINEI* aqui para liberarmos o início do atendimento.
            `.trim());

            await setUserState(from, {
                currentFlow: 'AGUARDANDO_ASSINATURA',
                currentStep: 'WAITING_SIGNATURE_CONFIRMATION',
                data: {
                    ...state.data,
                    statusOrcamento: 'ACEITO',
                    envelopeId: result.envelopeId,
                    signingUrl
                }
            });
        } catch (error) {
            await logger.error('wa_aceite_contrato_erro', 'Erro ao gerar contrato digital', error instanceof Error ? error : undefined);
            await sendMessage(from, '❌ Erro ao gerar contrato. Nossa equipe entrará em contato manualmente.');
        }
        return;
    }

    if (input === 'RECUSO' || input === '2' || input.startsWith('RECUSO')) {
        await sendMessage(from, `
Entendi. Gostaria de solicitar uma revisão do orçamento ou falar com um consultor?

1️⃣ Solicitar Revisão
2️⃣ Falar com Consultor
        `.trim());

        await setUserState(from, {
            currentStep: 'AWAITING_REFUSAL_REASON',
            data: { ...state.data, statusOrcamento: 'RECUSADO' }
        });
        return;
    }

    await sendMessage(from, '⚠️ Por favor, responda *ACEITO* para confirmar ou *RECUSO* para falar sobre os valores.');
}
