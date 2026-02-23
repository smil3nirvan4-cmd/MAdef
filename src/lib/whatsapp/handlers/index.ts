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
import { notifyAdminHelp } from '@/lib/notifications/emergency';
import { handleReprovado } from './reprovado';
import { handleAguardando } from './aguardando';
import { handleConfirmacaoProposta, handleAssinaturaContrato as handleAssinaturaContratoNovo } from './confirmacao-proposta';
import logger from '@/lib/observability/logger';




// Import logger (será funcional após instalação do Prisma)
let logMessage: ((params: { telefone: string; direcao: 'IN' | 'OUT'; conteudo: string; flow?: string; step?: string }) => Promise<void>) | null = null;
import('@/lib/database').then(db => { logMessage = db.logMessage; }).catch(() => { });

/**
 * Parse button response payload
 * Formato esperado: "action:confirm|order:12345"
 */
function parseButtonPayload(payload: string): Record<string, string> {
    const result: Record<string, string> = {};
    if (!payload) return result;

    payload.split('|').forEach(part => {
        const [key, value] = part.split(':');
        if (key && value) {
            result[key.trim()] = value.trim();
        }
    });
    return result;
}

export async function handleIncomingMessage(msg: any) {
    // Get full JID for database storage
    const fullJid = msg.key.remoteJid || '';
    // Extract phone number for logic (remove @s.whatsapp.net or @lid suffix)
    const phone = fullJid.replace('@s.whatsapp.net', '').replace('@lid', '');

    // Extrair texto - suporta múltiplos formatos incluindo button_reply
    let text = '';
    let buttonResponse: { id: string; text: string; payload?: Record<string, string> } | null = null;
    let listResponse: { id: string; title: string; description?: string } | null = null;

    // Texto normal
    if (msg.message?.conversation) {
        text = msg.message.conversation;
    } else if (msg.message?.extendedTextMessage?.text) {
        text = msg.message.extendedTextMessage.text;
    }

    // BUTTON REPLY - Resposta de botão (formato Baileys)
    if (msg.message?.buttonsResponseMessage) {
        const btnResp = msg.message.buttonsResponseMessage;
        buttonResponse = {
            id: btnResp.selectedButtonId || '',
            text: btnResp.selectedDisplayText || '',
            payload: parseButtonPayload(btnResp.selectedButtonId || '')
        };
        text = btnResp.selectedDisplayText || btnResp.selectedButtonId || '';
        void logger.whatsapp('wa_button_clicked', 'Botão clicado pelo usuário', { phone, buttonResponse });
    }

    // TEMPLATE BUTTON REPLY
    if (msg.message?.templateButtonReplyMessage) {
        const tplResp = msg.message.templateButtonReplyMessage;
        buttonResponse = {
            id: tplResp.selectedId || '',
            text: tplResp.selectedDisplayText || '',
            payload: parseButtonPayload(tplResp.selectedId || '')
        };
        text = tplResp.selectedDisplayText || tplResp.selectedId || '';
        void logger.whatsapp('wa_template_button_clicked', 'Template button clicado pelo usuário', { phone, buttonResponse });
    }

    // LIST RESPONSE - Resposta de lista
    if (msg.message?.listResponseMessage) {
        const listResp = msg.message.listResponseMessage;
        listResponse = {
            id: listResp.singleSelectReply?.selectedRowId || '',
            title: listResp.title || '',
            description: listResp.description || ''
        };
        text = listResp.singleSelectReply?.selectedRowId || listResp.title || '';
        void logger.whatsapp('wa_list_selected', 'Item de lista selecionado pelo usuário', { phone, listResponse });
    }

    // INTERACTIVE RESPONSE (formato mais recente)
    if (msg.message?.interactiveResponseMessage) {
        const intResp = msg.message.interactiveResponseMessage;
        try {
            const body = JSON.parse(intResp.nativeFlowResponseMessage?.paramsJson || '{}');
            buttonResponse = {
                id: body.id || '',
                text: body.display_text || '',
                payload: parseButtonPayload(body.id || '')
            };
            text = body.display_text || body.id || '';
            void logger.whatsapp('wa_interactive_response', 'Resposta interativa recebida', { phone, buttonResponse });
        } catch (_e) {
            void logger.warn('wa_interactive_parse_error', 'Erro ao parsear interactiveResponseMessage', { phone });
        }
    }

    const message: WhatsAppMessage = {
        from: fullJid, // IMPORTANTE: usar JID completo para respostas (@lid ou @s.whatsapp.net)
        body: text.trim(),
        type: buttonResponse ? 'button_reply' : listResponse ? 'list_reply' : 'text',
        timestamp: Date.now(),
        messageId: msg.key.id || '',
        buttonResponse,
        listResponse,
    };

    // Ignore protocol messages (status updates, etc)
    if (!message.body && !buttonResponse && !listResponse) {
        return;
    }

    void logger.whatsapp('wa_message_received', 'Mensagem recebida', {
        phone,
        fullJid,
        body: message.body,
        type: message.type,
        ...(buttonResponse ? { buttonResponse } : {}),
        ...(listResponse ? { listResponse } : {}),
    });

    // LOG: Mensagem recebida - save with FULL JID for dashboard display
    if (logMessage) {
        const state = await getUserState(phone);
        await logMessage({
            telefone: fullJid, // Use full JID so contacts API can find it
            direcao: 'IN',
            conteudo: buttonResponse ? `[BUTTON] ${text} (${buttonResponse.id})` : text.trim(),
            flow: state?.currentFlow,
            step: state?.currentStep,
        });
    }

    try {
        let state = await getUserState(phone);

        // Comandos globais - usar fullJid para enviar mensagens
        if (message.body.toUpperCase() === 'MENU') {
            await sendMainMenu(phone, fullJid);
            return;
        }

        if (message.body.toUpperCase() === 'AJUDA') {
            await sendHelpMessage(fullJid);
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

            case 'REPROVADO_TRIAGEM':
                return await handleReprovado(message, state);

            case 'AGUARDANDO_RH':
            case 'AGUARDANDO_AVALIACAO':
                return await handleAguardando(message, state);

            // Fluxos de proposta e contrato
            case 'AGUARDANDO_RESPOSTA_PROPOSTA':
                return await handleConfirmacaoProposta(message, state);

            case 'AGUARDANDO_CONTRATO':
                return await handleAssinaturaContratoNovo(message, state);

            case 'CLIENTE_ATIVO':
                // Cliente ativo pode acessar menu normalmente
                return await handleMainMenu(message, state);

            case 'MAIN_MENU':
                return await handleMainMenu(message, state);

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
        // ...
    }
}

async function handleMainMenu(message: WhatsAppMessage, state: UserState) {
    const { body, from } = message;

    // Opção 1: Meus Plantões
    if (body === '1') {
        await sendMessage(from, `
📅 *Meus Plantões*

Você ainda não tem plantões agendados.
Quando tiver, eles aparecerão aqui.

Digite *MENU* para voltar.
        `.trim());
        return;
    }

    // Opção 2: Meus Dados
    if (body === '2') {
        const dados = state.data || {};
        const nome = dados.nome || dados.nomePaciente || 'Não informado';

        await sendMessage(from, `
👤 *Meus Dados*

Nome: ${nome}
Telefone: ${from.split('@')[0]}

Para alterar, entre em contato com o suporte.
Digite *MENU* para voltar.
        `.trim());
        return;
    }

    // Opção 3: Ajuda
    if (body === '3') {
        await sendHelpMessage(from);
        return;
    }

    // Opção 4: Atendente
    if (body === '4') {
        await sendMessage(from, 'Um atendente humano foi notificado. Aguarde...');
        await notifyAdminHelp(from);
        return;
    }

    // Opção inválida
    await sendMessage(from, 'Opção inválida. Digite 1, 2, 3 ou 4.');
}

async function sendMainMenu(phone: string, replyJid: string) {
    await setUserState(phone, {
        currentFlow: 'MAIN_MENU',
        currentStep: 'SELECT_OPTION'
    });

    await sendMessage(replyJid, `
📋 *MENU PRINCIPAL*

1️⃣ Meus Plantões
2️⃣ Meus Dados
3️⃣ Ajuda
4️⃣ Falar com Atendente

Digite o número da opção:
    `.trim());
}

async function sendHelpMessage(replyJid: string) {
    await sendMessage(replyJid, `
📞 *Central de Atendimento*

Telefone: 0800-XXX-XXXX
WhatsApp: (11) 9XXXX-XXXX
Email: contato@maosamigas.com

Horário: Seg-Sex, 8h-18h

Um atendente entrará em contato em breve!
  `.trim());

    void logger.whatsapp('wa_help_requested', 'Usuário solicitou falar com atendente', { phone: replyJid });
    await notifyAdminHelp(replyJid);
}

// Handlers pendentes (placeholder)

// Todos os handlers registrados

