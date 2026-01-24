import { WhatsAppMessage } from '@/types/whatsapp';
import { UserState, setUserState } from '../state-manager';
import { sendMessage } from '../client';

export async function handleCheckinPlantao(
    message: WhatsAppMessage,
    state: UserState
) {
    const { body, from } = message;
    const input = body.toUpperCase().trim();

    if (input === 'INICIO' || input === '1') {
        const now = new Date();
        const { DB } = await import('@/lib/database');

        await DB.form.logSubmission('CHECKIN', {
            plantaoId: state.data.plantaoId,
            time: now.toISOString(),
            action: 'START'
        }, from);

        await sendMessage(from, `
📍 *Check-in Realizado!*
⏰ Horário: ${now.toLocaleTimeString('pt-BR')}

Bom plantão! Lembre-se de registrar qualquer intercorrência no relatório diário.

Para encerrar o plantão, digite *FIM*.
        `.trim());

        await setUserState(from, {
            currentStep: 'SHIFT_IN_PROGRESS',
            data: { ...state.data, checkinTime: now.toISOString() }
        });
        return;
    }

    if (input === 'FIM' || input === '2') {
        const now = new Date();
        const { DB } = await import('@/lib/database');
        const checkin = state.data.checkinTime ? new Date(state.data.checkinTime) : null;

        let diffText = '';
        if (checkin) {
            const diffMs = now.getTime() - checkin.getTime();
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            diffText = `\n⏱️ Duração: ${hours}h ${minutes}min`;
        }

        await DB.form.logSubmission('CHECKOUT', {
            plantaoId: state.data.plantaoId,
            time: now.toISOString(),
            duration: diffText,
            action: 'END'
        }, from);

        await sendMessage(from, `
🏁 *Plantão Encerrado!*
⏰ Horário: ${now.toLocaleTimeString('pt-BR')}${diffText}

Obrigado pelo seu trabalho! Seu relatório foi enviado para análise.
        `.trim());

        await setUserState(from, {
            currentFlow: 'IDLE',
            currentStep: '',
            data: {} // Limpar dados do plantão
        });
        return;
    }

    await sendMessage(from, '⚠️ Comandos disponíveis:\n1️⃣ *INICIO* - Começar plantão\n2️⃣ *FIM* - Encerrar plantão');
}
