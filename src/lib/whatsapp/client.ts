import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    WASocket,
    proto,
    AnyMessageContent
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { handleIncomingMessage } from './handlers';
import QRCode from 'qrcode';

let sock: WASocket | null = null;
let currentQR: string | null = null;

// Função para atualizar sessão no banco (importada dinamicamente para evitar erro de circular)
async function updateSession(status: string, qrCode?: string | null) {
    try {
        const { updateWhatsAppSession } = await import('@/lib/database');
        await updateWhatsAppSession({
            status,
            qrCode: qrCode ?? null,
            connectedAt: status === 'CONNECTED' ? new Date() : undefined,
            disconnectedAt: status === 'DISCONNECTED' ? new Date() : undefined,
        });
    } catch (error) {
        console.error('Erro ao atualizar sessão WA:', error);
    }
}

export async function initializeWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Captura QR Code e converte para base64
        if (qr) {
            try {
                currentQR = await QRCode.toDataURL(qr);
                console.log('📱 QR Code gerado - Escaneie no Admin Panel');
                await updateSession('QR_PENDING', currentQR);
            } catch (err) {
                console.error('Erro ao gerar QR:', err);
            }
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Conexão fechada. Reconectando:', shouldReconnect);
            await updateSession('DISCONNECTED');
            if (shouldReconnect) {
                initializeWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('✅ WhatsApp conectado!');
            currentQR = null;
            await updateSession('CONNECTED');
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            if (!msg.key.fromMe && msg.message) {
                await handleIncomingMessage(msg);
            }
        }
    });

    return sock;
}

export async function sendMessage(to: string, text: string) {
    if (process.env.MOCK_WA === 'true') {
        console.log(`[WA-MOCK-OUT] To: ${to} | Text: ${text}`);
        return;
    }
    if (!sock) throw new Error('WhatsApp não inicializado');

    const jid = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
    await sock.sendMessage(jid, { text });
}

export async function sendDocument(
    to: string,
    buffer: Buffer,
    filename: string,
    caption?: string
) {
    if (!sock) throw new Error('WhatsApp não inicializado');

    const jid = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;
    await sock.sendMessage(jid, {
        document: buffer,
        fileName: filename,
        mimetype: 'application/pdf',
        caption,
    });
}

export async function sendButtons(
    to: string,
    text: string,
    buttons: { id: string; text: string }[]
) {
    if (!sock) throw new Error('WhatsApp não inicializado');

    const jid = to.includes('@s.whatsapp.net') ? to : `${to}@s.whatsapp.net`;

    // Fallback: lista numerada
    const buttonText = buttons.map((b, i) => `${i + 1}️⃣ ${b.text}`).join('\n');
    await sock.sendMessage(jid, { text: `${text}\n\n${buttonText}` });
}

export function getCurrentQR() {
    return currentQR;
}

export function getSocket() {
    return sock;
}
