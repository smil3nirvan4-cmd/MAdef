import { WhatsAppMessage } from '@/types/whatsapp';
import { UserState, setUserState, checkCooldown, getCooldownTTL } from '../state-manager';
import { sendMessage } from '../client';
import { handleQuiz } from './quiz';

export async function handleReprovado(message: WhatsAppMessage, state: UserState) {
    const { from, body } = message;

    // Se usuário digitar MENU, libera para menu principal (opcional, ou bloqueia?)
    // Geralmente queremos permitir, mas se o foco é retry...
    // Vamos permitir MENU
    if (body.toUpperCase() === 'MENU') {
        // Deixa o index.ts tratar o MENU global, mas aqui podemos dar uma dica
    }

    // Verificar Cooldown
    const inCooldown = await checkCooldown(from);

    if (inCooldown) {
        const ttl = await getCooldownTTL(from);
        const minutes = Math.ceil(ttl / 60);
        await sendMessage(from, `
⏳ *Aguarde um pouco!*

Você precisa aguardar mais *${minutes} minuto(s)* para tentar o teste novamente.
Aproveite para revisar seus conhecimentos!
        `.trim());
        return;
    }

    // Se cooldown acabou
    if (state.currentStep === 'COOLDOWN') {
        // Oferecer nova tentativa
        await sendMessage(from, `
🔄 *Nova Chance*

O tempo de espera acabou. Você deseja tentar o Quiz de Triagem novamente?

1️⃣ Sim, quero tentar
2️⃣ Não, deixar para depois

Digite o número:
        `.trim());

        await setUserState(from, {
            currentStep: 'AWAITING_RETRY_DECISION'
        });
        return;
    }

    if (state.currentStep === 'AWAITING_RETRY_DECISION') {
        if (body === '1') {
            await sendMessage(from, 'Ótimo! Preparando novo teste...');

            // Reiniciar Quiz
            await setUserState(from, {
                currentFlow: 'QUIZ',
                currentStep: 'WELCOME',
                data: {
                    ...state.data,
                    retryCount: (state.data.retryCount || 0) + 1
                }
            });

            // Chama o quiz imediatamente
            await handleQuiz(message, {
                ...state,
                currentFlow: 'QUIZ',
                currentStep: 'WELCOME'
            });
            return;
        }

        if (body === '2') {
            await sendMessage(from, 'Tudo bem. Quando estiver pronto, basta mandar uma mensagem.');
            // Mantém no step atual ou reseta?
            // Mantendo permite que qualquer 'oi' futuro caia aqui e ofereça de novo
            return;
        }

        await sendMessage(from, 'Digite 1 para Sim ou 2 para Não.');
    }
}
