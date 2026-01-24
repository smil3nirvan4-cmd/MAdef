import { WhatsAppMessage } from '@/types/whatsapp';
import { UserState, setUserState, getUserState } from '../state-manager';
import { sendMessage } from '../client';
import { handleOnboarding } from './onboarding';
import { handleCadastroCuidador } from './cadastro-cuidador';
import { handleOfertaPlantao } from './oferta-plantao';
import { handleEscolhaSlot } from './escolha-slot';
import { handleQuiz } from './quiz';
import { handleAceiteOrcamento } from './aceite-orcamento';
import { handleAssinaturaContrato } from './assinatura-contrato';
import { handleCheckinPlantao } from './checkin';




// Import logger (será funcional após instalação do Prisma)
let logMessage: ((params: { telefone: string; direcao: 'IN' | 'OUT'; conteudo: string; flow?: string; step?: string }) => Promise<void>) | null = null;
import('@/lib/database').then(db => { logMessage = db.logMessage; }).catch(() => { });

export async function handleIncomingMessage(msg: any) {
    const phone = msg.key.remoteJid?.replace('@s.whatsapp.net', '') || '';
    const text = msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text || '';

    const message: WhatsAppMessage = {
        from: phone,
        body: text.trim(),
        type: 'text',
        timestamp: Date.now(),
        messageId: msg.key.id || '',
    };

    // LOG: Mensagem recebida
    if (logMessage) {
        const state = await getUserState(phone);
        await logMessage({
            telefone: phone,
            direcao: 'IN',
            conteudo: text.trim(),
            flow: state?.currentFlow,
            step: state?.currentStep,
        });
    }

    try {
        let state = await getUserState(phone);

        // Comandos globais
        if (message.body.toUpperCase() === 'MENU') {
            await sendMainMenu(phone);
            return;
        }

        if (message.body.toUpperCase() === 'AJUDA') {
            await sendHelpMessage(phone);
            return;
        }

        // Se não tem estado, inicia onboarding
        if (!state) {
            state = await setUserState(phone, {
                currentFlow: 'ONBOARDING',
                currentStep: 'WELCOME',
                data: {},
            });
            await handleOnboarding(message, state);
            return;
        }

        // Roteamento baseado no fluxo atual
        switch (state.currentFlow) {
            case 'ONBOARDING':
            case 'CADASTRO_PACIENTE':
                return await handleOnboarding(message, state);

            case 'CADASTRO_CUIDADOR':
                return await handleCadastroCuidador(message, state);

            case 'OFERTA_PLANTAO':
                return await handleOfertaPlantao(message, state);

            case 'ESCOLHA_SLOT':
                return await handleEscolhaSlot(message, state);

            case 'AGUARDANDO_ACEITE_ORCAMENTO':
                return await handleAceiteOrcamento(message, state);


            case 'AGUARDANDO_ASSINATURA':
                return await handleAssinaturaContrato(message, state);

            case 'CHECKIN_PLANTAO':
                return await handleCheckinPlantao(message, state);

            case 'QUIZ':

                return await handleQuiz(message, state);

            default:
                await sendMessage(phone, `
Olá! Não entendi sua mensagem.

Digite:
1️⃣ MENU - Ver opções
2️⃣ AJUDA - Falar com atendente
3️⃣ STATUS - Ver seus plantões
        `.trim());
        }
    } catch (error) {
        console.error('Erro ao processar mensagem:', error);
        await sendMessage(phone,
            'Desculpe, ocorreu um erro. Tente novamente ou digite AJUDA.'
        );
    }
}

async function sendMainMenu(phone: string) {
    await sendMessage(phone, `
📋 *MENU PRINCIPAL*

1️⃣ Meus Plantões
2️⃣ Meus Dados
3️⃣ Ajuda
4️⃣ Falar com Atendente

Digite o número da opção:
  `.trim());
}

async function sendHelpMessage(phone: string) {
    await sendMessage(phone, `
📞 *Central de Atendimento*

Telefone: 0800-XXX-XXXX
WhatsApp: (11) 9XXXX-XXXX
Email: contato@maosamigas.com

Horário: Seg-Sex, 8h-18h

Um atendente entrará em contato em breve!
  `.trim());

    // TODO: Notificar admin
}

// Handlers pendentes (placeholder)

// Todos os handlers registrados

