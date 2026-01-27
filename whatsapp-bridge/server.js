const express = require('express');
const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const PORT = process.env.WA_BRIDGE_PORT || 4000;
const AUTH_DIR = path.join(__dirname, 'auth_info');
const SESSION_FILE = path.join(process.cwd(), '..', '.wa-session.json');
// URL do webhook no Next.js (mesma máquina)
const WEBHOOK_URL = 'http://localhost:3000/api/whatsapp/webhook';

let sock = null;
let qrCode = null;
let connectionStatus = 'DISCONNECTED';
let connectedPhone = null;
let isConnecting = false;
let retryCount = 0;

function saveSession() {
    const data = {
        status: connectionStatus,
        qrCode: qrCode,
        connectedAt: connectionStatus === 'CONNECTED' ? new Date().toISOString() : null,
        phone: connectedPhone
    };
    try {
        fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2));
    } catch (e) { console.error('Error saving session:', e.message); }
}

async function sendToWebhook(data) {
    try {
        // Enviar A MENSAGEM INDIVIDUAL para o Next.js processar
        await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    } catch (error) {
        console.error('Webhook failed:', error.message);
    }
}

async function connectWhatsApp() {
    if (isConnecting || (sock && connectionStatus === 'CONNECTED')) return;

    isConnecting = true;
    console.log('🚀 Starting WhatsApp connection...');
    connectionStatus = 'CONNECTING';
    saveSession();

    try {
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

        sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            // Identidade Linux/Chrome para evitar erro 405
            browser: ['Maos Amigas Server', 'Ubuntu', '22.04'],
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
        });

        sock.ev.on('creds.update', saveCreds);

        // 1. Ouvir mensagens para Webhook
        sock.ev.on('messages.upsert', async (m) => {
            if (m.type === 'notify') {
                for (const msg of m.messages) {
                    // Ignora mensagens enviadas por mim mesmo (para evitar loop infinito se o bot responder a si mesmo)
                    if (!msg.key.fromMe) {
                        console.log(`📩 Webhook: Mensagem recebida de ${msg.key.remoteJid}`);
                        await sendToWebhook(msg);
                    }
                }
            }
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                try {
                    qrCode = await QRCode.toDataURL(qr);
                    connectionStatus = 'QR_PENDING';
                    saveSession();
                    console.log('📱 QR Code Novo Gerado!');
                } catch (err) { console.error('QR Error:', err); }
            }

            if (connection === 'close') {
                isConnecting = false;
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                console.log(`Connection closed. Code: ${statusCode}`);

                const shouldReconnect = statusCode !== DisconnectReason.loggedOut &&
                    statusCode !== 403 &&
                    statusCode !== 405 &&
                    retryCount < 10; // Aumentado retry

                connectionStatus = 'DISCONNECTED';
                qrCode = null;
                // sock = null; // Manter sock nulo apenas no reset total
                saveSession();

                if (shouldReconnect) {
                    retryCount++;
                    console.log(`Reconnecting in 5s... (Attempt ${retryCount})`);
                    setTimeout(connectWhatsApp, 5000);
                } else {
                    console.log('❌ Parando auto-reconnect (Erro crítico ou manual).');
                    retryCount = 0;
                }
            } else if (connection === 'open') {
                isConnecting = false;
                retryCount = 0;
                console.log('✅ WhatsApp connected!');
                connectionStatus = 'CONNECTED';
                qrCode = null;
                if (sock.user) connectedPhone = sock.user.id.split(':')[0];
                saveSession();
            }
        });
    } catch (error) {
        isConnecting = false;
        console.error('Connection error:', error.message);
        connectionStatus = 'DISCONNECTED';
        saveSession();
    }
}

// --- API ---

app.get('/status', (req, res) => res.json({
    status: connectionStatus,
    connected: connectionStatus === 'CONNECTED',
    qrCode: qrCode,
    phone: connectedPhone
}));

app.post('/connect', async (req, res) => {
    retryCount = 0;
    await connectWhatsApp();
    res.json({ success: true });
});

app.post('/disconnect', async (req, res) => {
    try { if (sock) await sock.logout(); } catch (e) { }
    sock = null;
    connectionStatus = 'DISCONNECTED';
    qrCode = null;
    connectedPhone = null;
    saveSession();
    res.json({ success: true });
});

app.post('/send', async (req, res) => {
    console.log('📨 [Bridge] Recebendo requisição /send:', JSON.stringify(req.body).substring(0, 100));

    // Endpoint essencial para envio de propostas
    if (!sock || connectionStatus !== 'CONNECTED') {
        console.log('❌ [Bridge] WhatsApp não conectado');
        return res.status(503).json({ error: 'WhatsApp não conectado' });
    }
    const { phone, message } = req.body;

    // Suporte a payload "to" (retrocompatibilidade)
    const target = phone || req.body.to;

    if (!target || !message) {
        console.log('❌ [Bridge] Dados inválidos:', { target, hasMessage: !!message });
        return res.status(400).json({ error: 'Dados inválidos' });
    }

    try {
        // Normalizar JID: remover @lid, @s.whatsapp.net, etc e reconstruir
        let cleanNumber = target.replace(/@.+$/, '').replace(/\D/g, '');
        // Formato do Brasil: garantir que tenha DDI
        if (cleanNumber.length === 10 || cleanNumber.length === 11) {
            cleanNumber = '55' + cleanNumber;
        }
        let jid = `${cleanNumber}@s.whatsapp.net`;

        console.log(`📤 [Bridge] Enviando para: ${jid} (original: ${target})`);
        console.log(`📝 [Bridge] Mensagem: ${message.substring(0, 50)}...`);

        const sent = await sock.sendMessage(jid, { text: message });
        console.log(`✅ [Bridge] Enviado com sucesso: ${sent.key.id}`);
        res.json({ success: true, id: sent.key.id });
    } catch (error) {
        console.error('❌ [Bridge] Send error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Bridge running on ${PORT}`);
    // Auto-connect se já tiver credenciais
    if (fs.existsSync(path.join(AUTH_DIR, 'creds.json'))) {
        console.log('Credenciais encontradas, reconectando...');
        connectWhatsApp();
    }
});
