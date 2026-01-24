import { WhatsAppMessage } from '@/types/whatsapp';
import { UserState, setUserState } from '../state-manager';
import { sendMessage } from '../client';

export async function handleAssinaturaContrato(
    message: WhatsAppMessage,
    state: UserState
) {
    const { body, from } = message;

    const input = body.toUpperCase().trim();

    if (input === 'CONCORDO' || input === '1') {
        await sendMessage(from, `
✍️ *Assinatura Confirmada!*

Os termos foram aceitos digitalmente. 

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
    }

    await sendMessage(from, '⚠️ Para prosseguir, você precisa ler o contrato acima e responder *CONCORDO*.');
}
