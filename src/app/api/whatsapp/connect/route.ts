import { NextResponse } from 'next/server';
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';

// Arquivo para persistir estado da sessão
const SESSION_FILE = path.join(process.cwd(), '.wa-session.json');

function saveSession(data: { status: string; qrCode: string | null; connectedAt: string | null }) {
    fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2));
}

function loadSession() {
    try {
        if (fs.existsSync(SESSION_FILE)) {
            return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
        }
    } catch (_e) {
        console.error('Erro ao ler sessão:', _e);
    }
    return { status: 'DISCONNECTED', qrCode: null, connectedAt: null };
}

// Variáveis globais
// Global declaration moved to types/globals.d.ts

global.waSocket = global.waSocket || null;
global.waConnecting = global.waConnecting || false;

export async function POST() {
    try {
        const currentSession = loadSession();

        // Se já está conectado
        if (currentSession.status === 'CONNECTED' && global.waSocket) {
            return NextResponse.json({
                success: true,
                message: 'WhatsApp já está conectado',
                status: 'CONNECTED',
            });
        }

        // Se já está conectando
        if (global.waConnecting) {
            return NextResponse.json({
                success: true,
                message: 'Conexão em andamento...',
                status: currentSession.status,
                qrCode: currentSession.qrCode,
            });
        }

        global.waConnecting = true;
        saveSession({ status: 'CONNECTING', qrCode: null, connectedAt: null });

        console.log('🚀 Iniciando conexão WhatsApp...');

        // Diretório de autenticação
        const authDir = path.join(process.cwd(), 'auth_info');
        const { state, saveCreds } = await useMultiFileAuthState(authDir);

        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: true,
        });

        global.waSocket = sock;

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                try {
                    const qrCodeDataURL = await QRCode.toDataURL(qr, { width: 300 });
                    saveSession({ status: 'QR_PENDING', qrCode: qrCodeDataURL, connectedAt: null });
                    console.log('📱 QR Code gerado e salvo! Verifique o painel admin.');
                } catch (err) {
                    console.error('Erro ao gerar QR:', err);
                }
            }

            if (connection === 'close') {
                const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                console.log(`Conexão fechada. Código: ${statusCode}. Reconectando: ${shouldReconnect}`);

                saveSession({ status: 'DISCONNECTED', qrCode: null, connectedAt: null });
                global.waSocket = null;
                global.waConnecting = false;
            } else if (connection === 'open') {
                console.log('✅ WhatsApp conectado com sucesso!');
                saveSession({ status: 'CONNECTED', qrCode: null, connectedAt: new Date().toISOString() });
                global.waConnecting = false;
            }
        });

        // Aguardar um pouco para o QR ser gerado
        await new Promise(resolve => setTimeout(resolve, 3000));

        const session = loadSession();

        return NextResponse.json({
            success: true,
            message: session.qrCode ? 'QR Code gerado! Escaneie agora.' : 'Iniciando conexão... Aguarde o QR Code',
            status: session.status,
            qrCode: session.qrCode,
        });
    } catch (error) {
        console.error('Erro ao conectar WhatsApp:', error);
        saveSession({ status: 'DISCONNECTED', qrCode: null, connectedAt: null });
        global.waConnecting = false;
        return NextResponse.json(
            { success: false, error: 'Erro ao iniciar conexão: ' + (error as Error).message },
            { status: 500 }
        );
    }
}
