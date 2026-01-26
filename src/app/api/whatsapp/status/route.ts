import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

const SESSION_FILE = path.join(process.cwd(), '.wa-session.json');

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

export async function GET() {
    const session = loadSession();
    return NextResponse.json(session);
}
