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

let sock = null;
let qrCode = null;
let connectionStatus = 'DISCONNECTED';
let connectedPhone = null;

function saveSession() {
    const data = {
        status: connectionStatus,
        qrCode: qrCode,
        connectedAt: connectionStatus === 'CONNECTED' ? new Date().toISOString() : null,
        phone: connectedPhone
    };
    fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2));
    console.log(`📁 Session saved: ${connectionStatus}`);
}

async function connectWhatsApp() {
    if (sock && connectionStatus === 'CONNECTED') {
        console.log('Already connected');
        return;
    }

    console.log('🚀 Starting WhatsApp connection...');
    connectionStatus = 'CONNECTING';
    saveSession();

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        browser: ['Mãos Amigas', 'Chrome', '120.0.0'],
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            try {
                qrCode = await QRCode.toDataURL(qr, { width: 300 });
                connectionStatus = 'QR_PENDING';
                saveSession();
                console.log('📱 QR Code generated');
            } catch (err) {
                console.error('QR Error:', err);
            }
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            console.log(`Connection closed. Code: ${statusCode}. Reconnecting: ${shouldReconnect}`);

            connectionStatus = 'DISCONNECTED';
            qrCode = null;
            connectedPhone = null;
            sock = null;
            saveSession();

            if (shouldReconnect) {
                setTimeout(connectWhatsApp, 5000);
            }
        } else if (connection === 'open') {
            console.log('✅ WhatsApp connected!');
            connectionStatus = 'CONNECTED';
            qrCode = null;

            if (sock.user) {
                connectedPhone = sock.user.id.split(':')[0];
            }
            saveSession();
        }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const msg of messages) {
            if (!msg.key.fromMe && msg.message) {
                const phone = msg.key.remoteJid?.replace('@s.whatsapp.net', '');
                const text = msg.message.conversation ||
                    msg.message.extendedTextMessage?.text ||
                    '[Media]';
                console.log(`📩 Message from ${phone}: ${text.substring(0, 50)}...`);

                try {
                    await fetch('http://localhost:3000/api/whatsapp/webhook', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            phone,
                            message: text,
                            messageId: msg.key.id,
                            timestamp: new Date().toISOString()
                        })
                    });
                } catch {
                    // Webhook might not be ready
                }
            }
        }
    });
}

// API Routes
app.get('/status', (req, res) => {
    res.json({
        status: connectionStatus,
        connected: connectionStatus === 'CONNECTED',
        qrCode: qrCode,
        phone: connectedPhone,
        connectedAt: connectionStatus === 'CONNECTED' ? new Date().toISOString() : null
    });
});

app.post('/connect', async (req, res) => {
    try {
        await connectWhatsApp();
        res.json({ success: true, status: connectionStatus, qrCode });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/disconnect', async (req, res) => {
    try {
        if (sock) {
            await sock.logout();
            sock = null;
        }
        connectionStatus = 'DISCONNECTED';
        qrCode = null;
        connectedPhone = null;
        saveSession();

        if (fs.existsSync(AUTH_DIR)) {
            fs.rmSync(AUTH_DIR, { recursive: true });
        }

        res.json({ success: true, message: 'Disconnected' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/send', async (req, res) => {
    const { to, message } = req.body;

    if (!sock || connectionStatus !== 'CONNECTED') {
        return res.status(400).json({ success: false, error: 'WhatsApp not connected' });
    }

    try {
        const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
        const result = await sock.sendMessage(jid, { text: message });

        console.log(`📤 Sent to ${to}: ${message.substring(0, 30)}...`);
        res.json({ success: true, messageId: result.key.id });
    } catch (error) {
        console.error('Send error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`🌉 WhatsApp Bridge running on port ${PORT}`);
    fs.writeFileSync(path.join(process.cwd(), '..', '.wa-bridge-port'), PORT.toString());
    connectWhatsApp();
});
