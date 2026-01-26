import { WhatsAppMessage } from '@/types/whatsapp';
import { UserState, setUserState } from '../state-manager';
import { sendMessage } from '../client';

export async function handleAssinaturaContrato(
    message: WhatsAppMessage,
    state: UserState
) {
    const { body, from } = message;

    const input = body.toUpperCase().trim();

    // Aceita variações de confirmação
    if (input.includes('ASSINEI') || input === 'PRONTO' || input === 'OK' || input === '1') {

        await sendMessage(from, '🔄 Verificando assinatura no sistema...');

        const envelopeId = state.data.envelopeId;
        if (!envelopeId) {
            await sendMessage(from, '❌ Erro: Identificador do contrato não encontrado. Fale com nosso suporte.');
            return;
        }

        // Validar status via API Mock/Real
        try {
            const { getSignatureProvider } = await import('@/lib/services/signature');
            const provider = getSignatureProvider();
            const status = await provider.checkStatus(envelopeId);

            if (status === 'SIGNED') {
                await sendMessage(from, `
✅ *Contrato Validado com Sucesso!*

Agora podemos prosseguir para a etapa final.

📍 *Próximos Passos:*
1. Geraremos o boleto/chave PIX do sinal.
2. Assim que identificado, os cuidadores serão liberados para o primeiro plantão.

Deseja receber a chave PIX agora?
1️⃣ Sim, enviar PIX
2️⃣ Aguardar boleto por e-mail
                `.trim());

                await setUserState(from, {
                    currentFlow: 'AGUARDANDO_PAGAMENTO',
                    currentStep: 'WAITING_PAYMENT_METHOD',
                    data: { ...state.data, contratoAssinado: true, assinadoEm: new Date().toISOString() }
                });
                return;
            } else {
                await sendMessage(from, `
⚠️ *Ainda não identificamos sua assinatura.*

Por favor, acesse o link enviado anteriormente, assine o documento digitalmente e depois volte aqui e digite *JÁ ASSINEI*.

Se tiver dificuldades, digite *AJUDA*.
                `.trim());
                return;
            }
        } catch (_e) {
            console.error('Erro ao validar assinatura:', _e);
            await sendMessage(from, '❌ Erro técnico ao validar. Tente novamente em instantes.');
            return;
        }
    }

    await sendMessage(from, '⚠️ Digite *JÁ ASSINEI* após concluir a assinatura no site, ou *AJUDA* se tiver problemas.');
}
