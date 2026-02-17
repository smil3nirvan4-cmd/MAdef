const express = require('express');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    Browsers,
} = require('baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const PORT = Number(process.env.WA_BRIDGE_PORT || 4000);
const AUTH_DIR = path.resolve(__dirname, 'auth_info');
const SESSION_FILE = path.resolve(process.cwd(), process.env.WA_SESSION_FILE || '.wa-session.json');
const WEBHOOK_URL = process.env.WA_WEBHOOK_URL || 'http://127.0.0.1:3000/api/whatsapp/webhook';
const RECONNECT_MAX_ATTEMPTS = Number(process.env.WA_RECONNECT_MAX_ATTEMPTS || 6);
const RECONNECT_BASE_DELAY_MS = Number(process.env.WA_RECONNECT_BASE_DELAY_MS || 5000);
const RECONNECT_MAX_DELAY_MS = Number(process.env.WA_RECONNECT_MAX_DELAY_MS || 20000);
const RETRY_405_LIMIT = Number(process.env.WA_RETRY_405_LIMIT || 2);

let sock = null;
let qrCode = null;
let connectionStatus = 'DISCONNECTED';
let connectedPhone = null;
let isConnecting = false;
let retryCount = 0;
let consecutive405 = 0;
let reconnectTimer = null;
let lastError = null;
let lastStatusCode = null;
let pairingCode = null;
let pairingCodeIssuedAt = null;

function ensureAuthDir() {
    try {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
    } catch {
        // best effort
    }
}

function resolveBrowser() {
    const profile = String(process.env.WA_BROWSER_PROFILE || 'macos').toLowerCase();
    const deviceName = process.env.WA_BROWSER_DEVICE || 'Desktop';

    if (profile === 'ubuntu' || profile === 'linux') return Browsers.ubuntu(deviceName);
    if (profile === 'windows') return Browsers.windows(deviceName);
    return Browsers.macOS(deviceName);
}

function saveSession() {
    const data = {
        status: connectionStatus,
        connected: connectionStatus === 'CONNECTED',
        qrCode,
        connectedAt: connectionStatus === 'CONNECTED' ? new Date().toISOString() : null,
        phone: connectedPhone,
        retryCount,
        lastStatusCode,
        lastError,
        pairingCode,
        pairingCodeIssuedAt,
    };

    try {
        fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('[bridge] failed to save session:', error.message);
    }
}

function clearReconnectTimer() {
    if (!reconnectTimer) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
}

function shouldAutoReconnect(statusCode) {
    if (retryCount >= RECONNECT_MAX_ATTEMPTS) return false;
    if (statusCode === 401) return false;
    if (statusCode === DisconnectReason.loggedOut || statusCode === 403) return false;
    if (statusCode === 405 && consecutive405 > RETRY_405_LIMIT) return false;
    return true;
}

function scheduleReconnect() {
    if (reconnectTimer) return;

    retryCount += 1;
    const delay = Math.min(RECONNECT_BASE_DELAY_MS * (2 ** (retryCount - 1)), RECONNECT_MAX_DELAY_MS);
    console.log(`[bridge] reconnect in ${Math.round(delay / 1000)}s (attempt ${retryCount}/${RECONNECT_MAX_ATTEMPTS})`);

    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connectWhatsApp({ resetRetry: false, source: 'auto-reconnect' }).catch((error) => {
            console.error('[bridge] reconnect attempt failed:', error.message);
        });
    }, delay);
}

async function sendToWebhook(data) {
    try {
        await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(8000),
        });
    } catch (error) {
        console.error('[bridge] webhook delivery failed:', error.message);
    }
}

function normalizeStatusCode(lastDisconnect) {
    return Number(
        lastDisconnect?.error?.output?.statusCode ??
        lastDisconnect?.error?.statusCode ??
        0
    ) || null;
}

async function connectWhatsApp({ resetRetry = true, source = 'manual' } = {}) {
    if (isConnecting) return;
    if (sock && connectionStatus === 'CONNECTED') return;

    if (source === 'manual') clearReconnectTimer();
    if (resetRetry) {
        retryCount = 0;
        consecutive405 = 0;
    }

    isConnecting = true;
    lastError = null;
    lastStatusCode = null;
    pairingCode = null;
    pairingCodeIssuedAt = null;
    connectionStatus = 'CONNECTING';
    saveSession();
    console.log(`[bridge] starting WhatsApp connection (${source})...`);

    try {
        ensureAuthDir();
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

        sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: resolveBrowser(),
            logger: pino({ level: process.env.WA_LOG_LEVEL || 'error' }),
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            syncFullHistory: false,
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('messages.upsert', async (event) => {
            if (event.type !== 'notify') return;

            for (const msg of event.messages) {
                if (msg.key?.fromMe) continue;

                let replyJid = msg.key?.remoteJid;
                if (replyJid && replyJid.includes('@lid') && msg.key?.participant && !msg.key.participant.includes('@lid')) {
                    replyJid = msg.key.participant;
                }

                await sendToWebhook({
                    ...msg,
                    _replyJid: replyJid,
                });
            }
        });

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                try {
                    qrCode = await QRCode.toDataURL(qr);
                    pairingCode = null;
                    pairingCodeIssuedAt = null;
                    connectionStatus = 'QR_PENDING';
                    saveSession();
                    console.log('[bridge] QR generated');
                } catch (error) {
                    console.error('[bridge] failed to encode QR:', error.message);
                }
            }

            if (connection === 'open') {
                isConnecting = false;
                retryCount = 0;
                consecutive405 = 0;
                lastError = null;
                lastStatusCode = null;
                qrCode = null;
                pairingCode = null;
                pairingCodeIssuedAt = null;
                connectionStatus = 'CONNECTED';
                connectedPhone = sock?.user?.id ? sock.user.id.split(':')[0] : null;
                saveSession();
                console.log('[bridge] WhatsApp connected');
                return;
            }

            if (connection !== 'close') return;

            isConnecting = false;
            qrCode = null;
            connectionStatus = 'DISCONNECTED';
            lastStatusCode = normalizeStatusCode(lastDisconnect);
            lastError = lastStatusCode
                ? `Connection closed (${lastStatusCode}).`
                : 'Connection closed.';

            if (lastStatusCode === 405) consecutive405 += 1;
            else consecutive405 = 0;

            saveSession();
            console.warn(`[bridge] connection closed (code=${lastStatusCode ?? 'unknown'})`);

            if (shouldAutoReconnect(lastStatusCode)) {
                scheduleReconnect();
                return;
            }

            clearReconnectTimer();
            console.warn('[bridge] auto-reconnect stopped');
            if (lastStatusCode === 401) {
                console.warn('[bridge] credentials invalid/expired. Use POST /reset-auth and pair again.');
            }
            if (lastStatusCode === 405) {
                console.warn('[bridge] repeated 405 detected. Use POST /reset-auth and pair again.');
            }
        });
    } catch (error) {
        isConnecting = false;
        connectionStatus = 'DISCONNECTED';
        lastError = `Connection error: ${error.message}`;
        saveSession();
        console.error('[bridge] connection setup failed:', error.message);
    }
}

async function disconnectWhatsApp() {
    clearReconnectTimer();

    try {
        if (sock) {
            await sock.logout();
        }
    } catch {
        // ignore logout failures
    }

    sock = null;
    isConnecting = false;
    retryCount = 0;
    consecutive405 = 0;
    qrCode = null;
    connectedPhone = null;
    connectionStatus = 'DISCONNECTED';
    lastError = null;
    lastStatusCode = null;
    pairingCode = null;
    pairingCodeIssuedAt = null;
    saveSession();
}

function resetAuthState() {
    clearReconnectTimer();

    try {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    } catch {
        // best effort
    }

    ensureAuthDir();
    sock = null;
    isConnecting = false;
    retryCount = 0;
    consecutive405 = 0;
    qrCode = null;
    connectedPhone = null;
    connectionStatus = 'DISCONNECTED';
    lastError = null;
    lastStatusCode = null;
    pairingCode = null;
    pairingCodeIssuedAt = null;
    saveSession();
}

app.get('/status', (_req, res) => {
    res.json({
        status: connectionStatus,
        connected: connectionStatus === 'CONNECTED',
        qrCode,
        phone: connectedPhone,
        isConnecting,
        retryCount,
        lastStatusCode,
        lastError,
        pairingCode,
        pairingCodeIssuedAt,
    });
});

app.post('/connect', async (_req, res) => {
    if (connectionStatus === 'CONNECTED') {
        return res.json({ success: true, status: connectionStatus });
    }

    await connectWhatsApp({ resetRetry: true, source: 'manual' });
    return res.json({ success: true, status: connectionStatus });
});

app.post('/disconnect', async (_req, res) => {
    await disconnectWhatsApp();
    return res.json({ success: true });
});

app.post('/reset-auth', async (_req, res) => {
    await disconnectWhatsApp();
    resetAuthState();
    return res.json({ success: true, status: connectionStatus });
});

app.post('/pair', async (req, res) => {
    const rawPhone = String(req.body?.phone || '').trim();
    const sanitizedPhone = rawPhone.replace(/\D/g, '');

    if (!sanitizedPhone || sanitizedPhone.length < 10) {
        return res.status(400).json({ success: false, error: 'Invalid phone number.' });
    }

    await connectWhatsApp({ resetRetry: true, source: 'pairing' });

    if (!sock) {
        return res.status(500).json({ success: false, error: 'Bridge socket not ready.' });
    }

    if (sock.authState?.creds?.registered) {
        return res.json({ success: true, status: connectionStatus, alreadyRegistered: true });
    }

    try {
        let generatedCode = null;
        let lastPairingError = null;

        for (let attempt = 1; attempt <= 3; attempt += 1) {
            try {
                generatedCode = await sock.requestPairingCode(sanitizedPhone);
                break;
            } catch (error) {
                lastPairingError = error;
                const message = String(error?.message || '').toLowerCase();
                if (!message.includes('connection closed') || attempt === 3) break;
                await new Promise((resolve) => setTimeout(resolve, 1200));
            }
        }

        if (!generatedCode) {
            throw lastPairingError || new Error('Failed to generate pairing code.');
        }

        pairingCode = generatedCode;
        pairingCodeIssuedAt = new Date().toISOString();
        qrCode = null;
        connectionStatus = 'PAIRING_CODE';
        saveSession();

        return res.json({
            success: true,
            status: connectionStatus,
            pairingCode,
            phone: sanitizedPhone,
        });
    } catch (error) {
        lastError = error?.message || 'Failed to generate pairing code.';
        saveSession();
        return res.status(500).json({ success: false, error: lastError });
    }
});

app.post('/send', async (req, res) => {
    if (!sock || connectionStatus !== 'CONNECTED') {
        return res.status(503).json({ error: 'WhatsApp is not connected.' });
    }

    const { phone, message, to } = req.body || {};
    const target = phone || to;

    if (!target || !message) {
        return res.status(400).json({ error: 'Invalid payload.' });
    }

    try {
        let jid;

        if (String(target).includes('@lid') || String(target).includes('@s.whatsapp.net')) {
            jid = String(target);
        } else {
            let cleanNumber = String(target).replace(/@.+$/, '').replace(/\D/g, '');
            if (cleanNumber.length === 10 || cleanNumber.length === 11) {
                cleanNumber = `55${cleanNumber}`;
            }
            jid = `${cleanNumber}@s.whatsapp.net`;
        }

        const sent = await sock.sendMessage(jid, { text: String(message) });
        return res.json({ success: true, id: sent?.key?.id || null });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Failed to send message.' });
    }
});

app.listen(PORT, () => {
    console.log(`Bridge running on ${PORT}`);

    if (fs.existsSync(path.join(AUTH_DIR, 'creds.json'))) {
        console.log('[bridge] existing credentials found, attempting reconnect...');
        connectWhatsApp({ resetRetry: true, source: 'startup' }).catch((error) => {
            console.error('[bridge] startup reconnect failed:', error.message);
        });
    }
});
