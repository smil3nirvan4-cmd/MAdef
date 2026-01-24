import { WhatsAppMessage } from '@/types/whatsapp';
import { UserState, setUserState } from '../state-manager';
import { sendMessage } from '../client';
import { MockRepository } from '@/lib/repositories/mock-db';

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

        await sendMessage(from, `
✅ *Orçamento Aceito!*

Excelente escolha! Estamos preparando o contrato digital para sua assinatura. 

Você receberá o link em instantes. 
        `.trim());

        await setUserState(from, {
            currentFlow: 'AGUARDANDO_ASSINATURA',
            currentStep: 'WAITING_CONTRACT',
            data: { ...state.data, statusOrcamento: 'ACEITO' }
        });
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
