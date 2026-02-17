import { prisma } from '@/lib/prisma';
import { sendMessage } from '@/lib/whatsapp/client';
import { getUserState } from '@/lib/whatsapp/state-manager';
import { notifyAdminHelp } from '@/lib/notifications/emergency';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

type ConversationState =
    | 'MENU'
    | 'ORCAMENTO_NOME'
    | 'ORCAMENTO_IDADE'
    | 'ORCAMENTO_TIPO_CUIDADO'
    | 'ORCAMENTO_ENDERECO'
    | 'ORCAMENTO_TELEFONE'
    | 'ORCAMENTO_OBSERVACOES'
    | 'ORCAMENTO_CONFIRMACAO';

interface ConversationData {
    nomePaciente?: string;
    idadePaciente?: number;
    tipoCuidado?: string;
    endereco?: string;
    telefoneContato?: string;
    observacoes?: string;
}

interface IncomingMessage {
    jid: string;
    phone: string;
    text: string;
}

const MAIN_MENU_TEXT = [
    '*Maos Amigas - Home Care*',
    '',
    'Ola! Como posso ajudar?',
    '',
    '1 - Nossos Servicos',
    '2 - Solicitar Orcamento',
    '3 - Falar com Atendente',
    '4 - Horario de Funcionamento',
    '',
    'Digite o numero da opcao desejada.',
].join('\n');

const SERVICES_TEXT = [
    '*Nossos Servicos*',
    '',
    '- Cuidador domiciliar (12h/24h)',
    '- Acompanhamento hospitalar',
    '- Suporte para idosos e pos-operatorio',
    '- Supervisao de enfermagem',
    '',
    'Digite 2 para solicitar um orcamento.',
].join('\n');

const HOURS_TEXT = [
    '*Horario de Funcionamento*',
    '',
    'Segunda a Sexta: 08:00 as 18:00',
    'Sabado: 08:00 as 12:00',
    'Plantao emergencial: 24h',
    '',
    'Digite MENU para voltar.',
].join('\n');

function normalizeText(value: string): string {
    return value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

function extractPhoneFromJid(jid: string): string {
    return jid.split('@')[0].replace(/\D/g, '');
}

function isGreeting(text: string): boolean {
    const normalized = normalizeText(text);
    return [
        'oi',
        'ola',
        'bom dia',
        'boa tarde',
        'boa noite',
        'hi',
        'hey',
    ].includes(normalized);
}

function isMenuCommand(text: string): boolean {
    const normalized = normalizeText(text);
    return ['menu', 'inicio', 'iniciar', 'voltar'].includes(normalized);
}

function isBudgetCommand(text: string): boolean {
    const normalized = normalizeText(text);
    return ['2', 'orcamento', 'preco', 'valor', 'solicitar orcamento'].includes(normalized);
}

function isHumanCommand(text: string): boolean {
    const normalized = normalizeText(text);
    return ['3', 'contato', 'falar', 'atendente', 'humano'].includes(normalized);
}

function isHoursCommand(text: string): boolean {
    const normalized = normalizeText(text);
    return ['4', 'horario', 'funcionamento'].includes(normalized);
}

function isServiceCommand(text: string): boolean {
    const normalized = normalizeText(text);
    return ['1', 'servicos', 'servico'].includes(normalized);
}

function parseConversationData(raw: string | null): ConversationData {
    if (!raw) return {};

    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            return parsed as ConversationData;
        }
    } catch {
        // keep empty data when JSON is invalid
    }

    return {};
}

async function saveSession(phone: string, state: ConversationState, data: ConversationData) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TIMEOUT_MS);

    await prisma.whatsAppSession.upsert({
        where: { phone },
        update: {
            state,
            data: JSON.stringify(data),
            lastActivity: now,
            expiresAt,
        },
        create: {
            phone,
            state,
            data: JSON.stringify(data),
            lastActivity: now,
            expiresAt,
        },
    });
}

async function loadSession(phone: string): Promise<{ state: ConversationState; data: ConversationData }> {
    const session = await prisma.whatsAppSession.findUnique({ where: { phone } });
    if (!session) return { state: 'MENU', data: {} };

    const now = Date.now();
    const lastActivity = session.lastActivity?.getTime() || session.updatedAt.getTime();
    const expiredByInactivity = now - lastActivity > SESSION_TIMEOUT_MS;
    const expiredByDate = session.expiresAt ? session.expiresAt.getTime() < now : false;

    if (expiredByInactivity || expiredByDate) {
        return { state: 'MENU', data: {} };
    }

    const state = (session.state || 'MENU') as ConversationState;
    const data = parseConversationData(session.data);
    return { state, data };
}

async function logIncoming(jid: string, text: string, state: string) {
    await prisma.mensagem.create({
        data: {
            telefone: jid,
            direcao: 'IN',
            conteudo: text,
            flow: 'BOT_ATENDIMENTO',
            step: state,
        },
    });
}

async function sendAndTrack(jid: string, text: string): Promise<boolean> {
    const result = await sendMessage(jid, text);
    return result.success;
}

async function createLeadFromBudget(phone: string, data: ConversationData) {
    const contactPhone = (data.telefoneContato || phone).replace(/\D/g, '');
    const patientName = data.nomePaciente || 'Lead WhatsApp';

    await prisma.paciente.upsert({
        where: { telefone: contactPhone },
        update: {
            nome: patientName,
            cidade: data.endereco || undefined,
            bairro: data.endereco || undefined,
            tipo: data.tipoCuidado || undefined,
            status: 'LEAD',
        },
        create: {
            telefone: contactPhone,
            nome: patientName,
            cidade: data.endereco || null,
            bairro: data.endereco || null,
            tipo: data.tipoCuidado || 'HOME_CARE',
            status: 'LEAD',
            prioridade: 'NORMAL',
        },
    });

    await prisma.formSubmission.create({
        data: {
            tipo: 'ORCAMENTO_WHATSAPP',
            telefone: contactPhone,
            dados: JSON.stringify(data),
        },
    });

    await prisma.systemLog.create({
        data: {
            type: 'WHATSAPP',
            action: 'orcamento_whatsapp_capturado',
            message: `Lead capturado via WhatsApp: ${patientName}`,
            metadata: JSON.stringify({
                phone: contactPhone,
                idade: data.idadePaciente,
                tipoCuidado: data.tipoCuidado,
            }),
        },
    });
}

function extractTextFromPayload(payload: any): string {
    if (typeof payload?.message?.conversation === 'string') {
        return payload.message.conversation.trim();
    }
    if (typeof payload?.message?.extendedTextMessage?.text === 'string') {
        return payload.message.extendedTextMessage.text.trim();
    }
    if (typeof payload?.message?.imageMessage?.caption === 'string') {
        return payload.message.imageMessage.caption.trim();
    }
    if (typeof payload?.message?.buttonsResponseMessage?.selectedDisplayText === 'string') {
        return payload.message.buttonsResponseMessage.selectedDisplayText.trim();
    }
    if (typeof payload?.message?.templateButtonReplyMessage?.selectedDisplayText === 'string') {
        return payload.message.templateButtonReplyMessage.selectedDisplayText.trim();
    }
    if (typeof payload?.message?.listResponseMessage?.singleSelectReply?.selectedRowId === 'string') {
        return payload.message.listResponseMessage.singleSelectReply.selectedRowId.trim();
    }
    return '';
}

function extractIncomingMessage(payload: any): IncomingMessage | null {
    const jid = String(payload?._replyJid || payload?.key?.remoteJid || '').trim();
    if (!jid) return null;

    const text = extractTextFromPayload(payload);
    if (!text) return null;

    return {
        jid,
        phone: extractPhoneFromJid(jid),
        text,
    };
}

function isLegacyFlowActive(flow: string | undefined): boolean {
    if (!flow) return false;
    return !['IDLE', 'MAIN_MENU'].includes(flow);
}

function buildBudgetSummary(data: ConversationData): string {
    return [
        '*Resumo do Orcamento*',
        `Nome: ${data.nomePaciente || '-'}`,
        `Idade: ${data.idadePaciente || '-'}`,
        `Tipo de cuidado: ${data.tipoCuidado || '-'}`,
        `Endereco: ${data.endereco || '-'}`,
        `Telefone: ${data.telefoneContato || '-'}`,
        `Observacoes: ${data.observacoes || '-'}`,
        '',
        'Digite 1 para confirmar ou 2 para reiniciar.',
    ].join('\n');
}

async function handleBudgetState(message: IncomingMessage, state: ConversationState, data: ConversationData) {
    const normalized = normalizeText(message.text);

    if (state === 'ORCAMENTO_NOME') {
        if (message.text.trim().length < 3) {
            await sendAndTrack(message.jid, 'Informe o nome completo do paciente.');
            return { handled: true, state, data };
        }

        const nextData = { ...data, nomePaciente: message.text.trim() };
        await sendAndTrack(message.jid, 'Qual a idade do paciente?');
        return { handled: true, state: 'ORCAMENTO_IDADE' as ConversationState, data: nextData };
    }

    if (state === 'ORCAMENTO_IDADE') {
        const age = Number.parseInt(message.text.replace(/\D/g, ''), 10);
        if (!Number.isInteger(age) || age < 0 || age > 120) {
            await sendAndTrack(message.jid, 'Idade invalida. Informe apenas numero (ex.: 78).');
            return { handled: true, state, data };
        }

        const nextData = { ...data, idadePaciente: age };
        await sendAndTrack(
            message.jid,
            [
                'Qual tipo de cuidado voce precisa?',
                '1 - Cuidador domiciliar',
                '2 - Acompanhamento hospitalar',
                '3 - Pos-operatorio/reabilitacao',
            ].join('\n')
        );
        return { handled: true, state: 'ORCAMENTO_TIPO_CUIDADO' as ConversationState, data: nextData };
    }

    if (state === 'ORCAMENTO_TIPO_CUIDADO') {
        const map: Record<string, string> = {
            '1': 'Cuidador domiciliar',
            '2': 'Acompanhamento hospitalar',
            '3': 'Pos-operatorio/reabilitacao',
        };

        const tipoCuidado = map[normalized] || message.text.trim();
        const nextData = { ...data, tipoCuidado };
        await sendAndTrack(message.jid, 'Informe cidade e bairro do atendimento.');
        return { handled: true, state: 'ORCAMENTO_ENDERECO' as ConversationState, data: nextData };
    }

    if (state === 'ORCAMENTO_ENDERECO') {
        if (message.text.trim().length < 3) {
            await sendAndTrack(message.jid, 'Informe cidade e bairro para continuarmos.');
            return { handled: true, state, data };
        }

        const nextData = { ...data, endereco: message.text.trim() };
        await sendAndTrack(
            message.jid,
            'Qual telefone para contato? Se for o mesmo numero, digite "mesmo".'
        );
        return { handled: true, state: 'ORCAMENTO_TELEFONE' as ConversationState, data: nextData };
    }

    if (state === 'ORCAMENTO_TELEFONE') {
        const currentPhone = message.phone;
        let phone = currentPhone;

        if (!['mesmo', 'igual'].includes(normalized)) {
            phone = message.text.replace(/\D/g, '');
            if (phone.length < 10) {
                await sendAndTrack(message.jid, 'Telefone invalido. Envie com DDD (ex.: 11999998888).');
                return { handled: true, state, data };
            }
        }

        const nextData = { ...data, telefoneContato: phone };
        await sendAndTrack(message.jid, 'Deseja adicionar observacoes? Se nao, digite "nao".');
        return { handled: true, state: 'ORCAMENTO_OBSERVACOES' as ConversationState, data: nextData };
    }

    if (state === 'ORCAMENTO_OBSERVACOES') {
        const nextData = {
            ...data,
            observacoes: ['nao', 'nenhuma', 'n/a'].includes(normalized) ? 'Nenhuma' : message.text.trim(),
        };
        await sendAndTrack(message.jid, buildBudgetSummary(nextData));
        return { handled: true, state: 'ORCAMENTO_CONFIRMACAO' as ConversationState, data: nextData };
    }

    if (state === 'ORCAMENTO_CONFIRMACAO') {
        if (['1', 'sim', 'confirmar', 'confirmo'].includes(normalized)) {
            await createLeadFromBudget(message.phone, data);
            await sendAndTrack(
                message.jid,
                'Perfeito. Seu pedido de orcamento foi registrado. Nossa equipe entrara em contato em breve.'
            );
            return { handled: true, state: 'MENU' as ConversationState, data: {} };
        }

        if (['2', 'nao', 'reiniciar', 'cancelar'].includes(normalized)) {
            await sendAndTrack(message.jid, MAIN_MENU_TEXT);
            return { handled: true, state: 'MENU' as ConversationState, data: {} };
        }

        await sendAndTrack(message.jid, 'Digite 1 para confirmar ou 2 para reiniciar.');
        return { handled: true, state, data };
    }

    return { handled: false, state, data };
}

async function beginBudgetFlow(message: IncomingMessage) {
    const data: ConversationData = {};
    await sendAndTrack(message.jid, 'Vamos iniciar seu orcamento. Informe o nome completo do paciente.');
    return { state: 'ORCAMENTO_NOME' as ConversationState, data };
}

export async function handleConversationMessage(payload: any): Promise<boolean> {
    const incoming = extractIncomingMessage(payload);
    if (!incoming) return false;

    if (payload?.key?.fromMe) return true;

    const legacyState = await getUserState(incoming.phone);
    const session = await loadSession(incoming.phone);
    const hasConversationSession = session.state !== 'MENU' || Object.keys(session.data).length > 0;

    if (isLegacyFlowActive(legacyState?.currentFlow) && !hasConversationSession) {
        return false;
    }

    await logIncoming(incoming.jid, incoming.text, session.state);

    const normalized = normalizeText(incoming.text);

    if (isGreeting(incoming.text) || isMenuCommand(incoming.text)) {
        await sendAndTrack(incoming.jid, MAIN_MENU_TEXT);
        await saveSession(incoming.phone, 'MENU', {});
        return true;
    }

    if (isServiceCommand(incoming.text)) {
        await sendAndTrack(incoming.jid, SERVICES_TEXT);
        await saveSession(incoming.phone, 'MENU', {});
        return true;
    }

    if (isBudgetCommand(incoming.text) && session.state === 'MENU') {
        const started = await beginBudgetFlow(incoming);
        await saveSession(incoming.phone, started.state, started.data);
        return true;
    }

    if (isHumanCommand(incoming.text) && session.state === 'MENU') {
        await sendAndTrack(
            incoming.jid,
            'Perfeito. Um atendente humano foi notificado e vai continuar seu atendimento.'
        );
        await saveSession(incoming.phone, 'MENU', {});
        await notifyAdminHelp(incoming.jid);
        return true;
    }

    if (isHoursCommand(incoming.text) && session.state === 'MENU') {
        await sendAndTrack(incoming.jid, HOURS_TEXT);
        await saveSession(incoming.phone, 'MENU', {});
        return true;
    }

    if (session.state !== 'MENU') {
        const result = await handleBudgetState(incoming, session.state, session.data);
        if (!result.handled) return false;
        await saveSession(incoming.phone, result.state, result.data);
        return true;
    }

    if (normalized.length > 0 && hasConversationSession) {
        await sendAndTrack(incoming.jid, `${MAIN_MENU_TEXT}\n\nNao entendi. Digite uma opcao valida.`);
        await saveSession(incoming.phone, 'MENU', {});
        return true;
    }

    return false;
}
