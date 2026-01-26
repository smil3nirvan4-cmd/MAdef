import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const SESSION_FILE = path.join(process.cwd(), '.wa-session.json');

// Global declaration moved to types/globals.d.ts

function saveSession(data: { status: string; qrCode: string | null; connectedAt: string | null }) {
    fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2));
}

export async function POST() {
    try {
        if (global.waSocket) {
            try {
                await global.waSocket.logout();
            } catch (_e) {
                console.log('Socket já estava desconectado');
            }
            global.waSocket = null;
        }

        saveSession({ status: 'DISCONNECTED', qrCode: null, connectedAt: null });

        // Deletar pasta de autenticação para forçar novo QR
        const authDir = path.join(process.cwd(), 'auth_info');
        if (fs.existsSync(authDir)) {
            fs.rmSync(authDir, { recursive: true, force: true });
        }

        console.log('🔌 WhatsApp desconectado e sessão limpa');

        return NextResponse.json({
            success: true,
            message: 'WhatsApp desconectado e sessão limpa',
        });
    } catch (error) {
        console.error('Erro ao desconectar WhatsApp:', error);
        return NextResponse.json(
            { success: false, error: 'Erro ao desconectar' },
            { status: 500 }
        );
    }
}
