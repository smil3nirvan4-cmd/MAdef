import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    WASocket,
    fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import pino from 'pino';
import { handleIncomingMessage } from './handlers';

let sock: WASocket | null = null;
let isConnecting = false;
const SESSION_FILE = path.join(process.cwd(), '.wa-session.json');

// Logger para debug
const logger = pino({ level: 'info' });

function saveSessionFile(data: { status: string; qrCode: string | null; connectedAt: string | null }) {
    try {
        fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2));
    } catch (_e) {
        logger.error({ error: _e }, 'Erro ao salvar sessão em arquivo');
    }
}

// Atualizar status no banco e arquivo
async function updateSession(status: string, qrCode?: string | null) {
    saveSessionFile({
        status,
        qrCode: qrCode ?? null,
        connectedAt: status === 'CONNECTED' ? new Date().toISOString() : null,
    });

    // Tenta atualizar no DB (opcional, não bloqueante)
    try {
        const { updateWhatsAppSession } = await import('@/lib/database');
        await updateWhatsAppSession({
            status,
            qrCode: qrCode ?? null,
            connectedAt: status === 'CONNECTED' ? new Date() : undefined,
            disconnectedAt: status === 'DISCONNECTED' ? new Date() : undefined,
        });
    } catch (error) {
        // Silêncio
    }
}

export async function initializeWhatsApp() {
    if (isConnecting) {
        console.log('⚠️ Já existe uma tentativa de conexão em andamento. Ignorando...');
        return sock;
    }
    isConnecting = true;

    console.log('🔄 Inicializando WhatsApp Socket...');
    updateSession('CONNECTING');

    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    // Buscar versão mais recente
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`ℹ️ Usando Baileys v${version.join('.')} (Latest: ${isLatest})`);

    sock = makeWASocket({
        version,
        auth: state,
        logger,
        printQRInTerminal: false, // Nós gerenciamos o QR

        // Configurações de estabilidade e rede
        // Browser padrão do Baileys é mais seguro contra bans e erros
        syncFullHistory: false, // Mais rápido
        generateHighQualityLinkPreview: true,
        retryRequestDelayMs: 5000,
        keepAliveIntervalMs: 30000,
        connectTimeoutMs: 60000,
        emitOwnEvents: false,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('📱 QR CODE RECEBIDO!');
            try {
                const qrCodeDataURL = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
                console.log('✅ QR convertido para imagem. Disponível na UI.');
                await updateSession('QR_PENDING', qrCodeDataURL);
            } catch (err) {
                console.error('❌ Erro ao converter QR:', err);
            }
        }

        if (connection === 'close') {
            const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
            const isConflict = reason === 440; // Conflict = replaced by another session
            const shouldReconnect = reason !== DisconnectReason.loggedOut && !isConflict;
            const logMsg = `❌ Conexão fechada: ${reason || 'Desconhecido'}. Reconectar: ${shouldReconnect}`;
            console.log(logMsg);

            await updateSession('DISCONNECTED');

            if (isConflict) {
                console.error('⚠️ CONFLITO DETECTADO (440): Outra sessão WhatsApp Web está ativa.');
                console.error('👉 SOLUÇÃO: Feche o WhatsApp Web no navegador ou aguarde 30 segundos.');
                console.error('🔄 Tentando reconectar em 30 segundos com nova sessão...');

                // Delete auth to force fresh QR on next connect
                if (fs.existsSync('auth_info')) {
                    fs.rmSync('auth_info', { recursive: true, force: true });
                }

                // Wait 30 seconds before retrying (let other session stabilize)
                setTimeout(() => initializeWhatsApp(), 30000);
            } else if (shouldReconnect) {
                const delay = reason === DisconnectReason.restartRequired ? 0 : 5000;
                console.log(`⏳ Reconectando em ${delay}ms...`);
                setTimeout(() => initializeWhatsApp(), delay);
            } else {
                console.log('⛔ Usuário desconectado. Limpando sessão...');
                if (fs.existsSync('auth_info')) {
                    fs.rmSync('auth_info', { recursive: true, force: true });
                }
                updateSession('DISCONNECTED');
            }
        } else if (connection === 'open') {
            const successMsg = '✅ CONEXÃO ESTABELECIDA COM SUCESSO!';
            console.log(successMsg);
            logger.info(successMsg);

            // Forçar salvamento imediato no arquivo
            try {
                const sessionData = {
                    status: 'CONNECTED',
                    qrCode: null,
                    connectedAt: new Date().toISOString()
                };
                fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
                console.log('📂 Sessão CONNECTED salva no arquivo .wa-session.json');
            } catch (_e) {
                console.error('Erro ao salvar arquivo de sessão:', _e);
            }

            await updateSession('CONNECTED');

            // Processar fila de mensagens pendentes
            try {
                const { processQueue } = await import('./queue');
                console.log('📨 [Queue] Processando mensagens pendentes...');
                processQueue();
            } catch (_e) {
                console.error('[Queue] Erro ao processar fila:', _e);
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            if (!msg.key.fromMe && msg.message) {
                await handleIncomingMessage(msg);
            }
        }
    });

    // Reset lock to allow future reconnections if needed
    // Safety delay to prevent instant loops
    setTimeout(() => { isConnecting = false; }, 5000);

    return sock;
}

/**
 * Enviar mensagem com fallback para fila
 * Se o socket não estiver disponível, a mensagem vai para a fila
 * e será enviada automaticamente quando a conexão for restabelecida
 */
// Import logger for outgoing messages
let logMessage: ((params: { telefone: string; direcao: 'IN' | 'OUT'; conteudo: string; flow?: string; step?: string }) => Promise<void>) | null = null;
import('../database').then(db => { logMessage = db.logMessage; }).catch(() => { });

export async function sendMessage(to: string, text: string): Promise<{ success: boolean; queued: boolean; messageId?: string }> {
    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

    console.log(`📤 ENVIANDO MENSAGEM PARA: ${jid}`);
    console.log(`📝 CONTEÚDO: "${text}"`);

    // Tentar enviar diretamente se o socket estiver disponível
    if (sock) {
        try {
            const result = await sock.sendMessage(jid, { text });
            console.log('✅ ENVIO CONFIRMADO PELO SOCKET');

            // Log outgoing message to database
            if (logMessage) {
                await logMessage({
                    telefone: jid,
                    direcao: 'OUT',
                    conteudo: text,
                    flow: 'BOT',
                    step: 'SENT',
                });
            }

            return { success: true, queued: false, messageId: result?.key?.id ?? undefined };
        } catch (e: any) {
            console.error('❌ ERRO AO ENVIAR MENSAGEM:', e.message);
            // Fallback para fila
        }
    }

    // Se chegou aqui, precisa usar a fila
    console.log('⏳ Socket indisponível, adicionando à fila...');
    const { addToQueue } = await import('./queue');
    const messageId = addToQueue(to, text);

    return { success: false, queued: true, messageId };
}
/**
 * Enviar mensagem com botões interativos (Quick Reply Buttons)
 * 
 * ⚠️ IMPORTANTE: Baileys (biblioteca não-oficial) NÃO consegue renderizar
 * botões nativos porque o WhatsApp bloqueou essa funcionalidade para clientes
 * não-oficiais desde ~2024.
 * 
 * Esta função envia TEXTO NUMERADO que funciona em todos os dispositivos.
 * O usuário pode digitar o número ou clicar (em alguns clientes).
 * 
 * Para botões nativos, seria necessário usar a WhatsApp Cloud API oficial
 * da Meta, que requer Business Manager verificado e templates aprovados.
 */
export async function sendButtons(
    to: string,
    text: string,
    buttons: { id: string; text: string; payload?: string }[],
    footer?: string
): Promise<{ success: boolean; error?: string; method?: string }> {
    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

    console.log(`📤 ENVIANDO BOTÕES PARA: ${jid}`);
    console.log(`📋 Botões: ${buttons.map(b => b.text).join(', ')}`);

    if (!sock) {
        return { success: false, error: 'Socket não disponível' };
    }

    // Validação conforme spec: máx 3 botões, título máx 20 chars
    const validatedButtons = buttons.slice(0, 3).map((btn, idx) => {
        const truncatedText = btn.text.length > 20 ? btn.text.substring(0, 17) + '...' : btn.text;
        return {
            id: btn.id || `btn_${idx}`,
            text: truncatedText,
            payload: btn.payload || `action:${btn.id || idx}`
        };
    });

    // FORÇAR FALLBACK: Enviar como texto formatado com números
    // Esta é a ÚNICA forma garantida de funcionar com Baileys
    const emojis = ['1️⃣', '2️⃣', '3️⃣'];
    const fallbackText = `${text}\n\n${validatedButtons.map((b, i) => `${emojis[i]} ${b.text}`).join('\n')}${footer ? `\n\n_${footer}_` : ''}`;

    try {
        await sock.sendMessage(jid, { text: fallbackText });
        console.log('✅ MENU ENVIADO (texto numerado)');

        if (logMessage) {
            await logMessage({
                telefone: jid,
                direcao: 'OUT',
                conteudo: fallbackText,
                flow: 'BOT',
                step: 'MENU_SENT',
            });
        }

        return { success: true, method: 'text_numbered' };
    } catch (e: any) {
        console.error('❌ FALHA AO ENVIAR MENU:', e.message);
        return { success: false, error: e.message };
    }
}

/**
 * Enviar mensagem com lista de opções (List Message)
 * Para quando há muitas opções
 */
export async function sendList(to: string, text: string, buttonText: string, sections: { title: string; rows: { id: string; title: string; description?: string }[] }[], footer?: string): Promise<{ success: boolean; error?: string }> {
    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

    console.log(`📤 ENVIANDO LISTA PARA: ${jid}`);

    if (!sock) {
        return { success: false, error: 'Socket não disponível' };
    }

    try {
        const listMessage = {
            text: text,
            footer: footer || '',
            title: '',
            buttonText: buttonText,
            sections: sections.map(s => ({
                title: s.title,
                rows: s.rows.map(r => ({
                    title: r.title,
                    rowId: r.id,
                    description: r.description || ''
                }))
            }))
        };

        await sock.sendMessage(jid, listMessage);
        console.log('✅ LISTA ENVIADA');
        return { success: true };
    } catch (e: any) {
        console.error('❌ ERRO AO ENVIAR LISTA:', e.message);

        // Fallback: enviar como texto numerado
        let fallbackText = `${text}\n`;
        sections.forEach(s => {
            fallbackText += `\n*${s.title}*\n`;
            s.rows.forEach((r, i) => {
                fallbackText += `${i + 1}. ${r.title}${r.description ? ` - ${r.description}` : ''}\n`;
            });
        });
        if (footer) fallbackText += `\n_${footer}_`;

        try {
            await sock.sendMessage(jid, { text: fallbackText });
            console.log('✅ FALLBACK: Enviado como texto');
            return { success: true };
        } catch (e2: any) {
            return { success: false, error: e2.message };
        }
    }
}

/**
 * Enviar mensagem interativa (Template Buttons com URL/Call)
 */
export async function sendTemplateButtons(to: string, text: string, templateButtons: { type: 'url' | 'call' | 'quickReply'; text: string; url?: string; phoneNumber?: string; id?: string }[], footer?: string): Promise<{ success: boolean; error?: string }> {
    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

    console.log(`📤 ENVIANDO TEMPLATE BUTTONS PARA: ${jid}`);

    if (!sock) {
        return { success: false, error: 'Socket não disponível' };
    }

    try {
        const buttons = templateButtons.slice(0, 3).map((btn, idx) => {
            if (btn.type === 'url') {
                return { index: idx + 1, urlButton: { displayText: btn.text, url: btn.url || '' } };
            } else if (btn.type === 'call') {
                return { index: idx + 1, callButton: { displayText: btn.text, phoneNumber: btn.phoneNumber || '' } };
            } else {
                return { index: idx + 1, quickReplyButton: { displayText: btn.text, id: btn.id || `btn_${idx}` } };
            }
        });

        const templateMessage = {
            text: text,
            footer: footer || '',
            templateButtons: buttons
        };

        await sock.sendMessage(jid, templateMessage);
        console.log('✅ TEMPLATE BUTTONS ENVIADOS');
        return { success: true };
    } catch (e: any) {
        console.error('❌ ERRO AO ENVIAR TEMPLATE:', e.message);

        // Fallback
        const fallbackText = `${text}\n\n${templateButtons.map((b, i) => `${i + 1}️⃣ ${b.text}${b.url ? ` (${b.url})` : ''}`).join('\n')}`;
        try {
            await sock.sendMessage(jid, { text: fallbackText });
            return { success: true };
        } catch (e2: any) {
            return { success: false, error: e2.message };
        }
    }
}

/**
 * Enviar mensagem forçando uso da fila (para casos de alta confiabilidade)
 */
export async function sendMessageQueued(to: string, text: string): Promise<string> {
    const { addToQueue } = await import('./queue');
    return addToQueue(to, text);
}

export function getSocket() {
    return sock;
}


