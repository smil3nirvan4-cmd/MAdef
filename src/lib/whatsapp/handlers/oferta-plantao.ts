import { WhatsAppMessage } from '@/types/whatsapp';
import { UserState, setUserState } from '../state-manager';
import { sendMessage } from '../client';

export async function handleOfertaPlantao(
    message: WhatsAppMessage,
    state: UserState
) {
    const { body, from } = message;
    const { ofertaId, slotId } = state.data;

    const resposta = body.trim().toUpperCase();

    if (resposta === 'ACEITO' || resposta === '1') {
        // Aceita oferta
        const { DB } = await import('@/lib/database');

        await DB.alocacao.update(state.data.alocacaoId, {
            status: 'CONFIRMADO',
            respondidoEm: new Date()
        });

        await sendMessage(from, `
✅ Parabéns! Plantão confirmado!

Você receberá em breve:
• Briefing completo do paciente
• Dados de contato da família
• Localização no Maps

Obrigado! 🙏
    `.trim());

        await setUserState(from, {
            currentFlow: 'IDLE',
            currentStep: '',
            data: {},
        });
        return;
    }

    if (resposta === 'RECUSO' || resposta === '2') {
        const { DB } = await import('@/lib/database');
        await DB.alocacao.update(state.data.alocacaoId, {
            status: 'RECUSADO',
            respondidoEm: new Date()
        });

        await sendMessage(from, `
Entendido! Pode me dizer o motivo?

1️⃣ Horário incompatível
2️⃣ Local muito longe
3️⃣ Valor insuficiente
4️⃣ Já tenho compromisso
5️⃣ Outro

Digite o número:
    `.trim());

        await setUserState(from, {
            currentStep: 'AWAITING_MOTIVO_RECUSA',
        });
        return;
    }

    // Motivo da recusa
    if (state.currentStep === 'AWAITING_MOTIVO_RECUSA') {
        const { DB } = await import('@/lib/database');
        const motivos = {
            '1': 'Horário incompatível',
            '2': 'Local muito longe',
            '3': 'Valor insuficiente',
            '4': 'Já tem compromisso',
            '5': 'Outro',
        };

        const motivo = motivos[body.trim() as keyof typeof motivos] || body;

        await DB.form.logSubmission('RECUSA_PLANTAO', {
            alocacaoId: state.data.alocacaoId,
            motivo: motivo
        }, from);

        await sendMessage(from, 'Obrigado pelo feedback! Até a próxima oportunidade. 😊');

        await setUserState(from, {
            currentFlow: 'IDLE',
            currentStep: '',
            data: {},
        });
        return;
    }

    // Resposta inválida
    await sendMessage(from, 'Por favor, responda ACEITO ou RECUSO');
}
