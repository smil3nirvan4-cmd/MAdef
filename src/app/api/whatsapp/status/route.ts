import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

const SESSION_FILE = path.join(process.cwd(), '.wa-session.json');

async function getBridgeStatus() {
    const portFile = path.join(process.cwd(), '.wa-bridge-port');
    let bridgePort = '4000';

    if (existsSync(portFile)) {
        bridgePort = readFileSync(portFile, 'utf-8').trim();
    }

    try {
        const response = await fetch(`http://localhost:${bridgePort}/status`, {
            signal: AbortSignal.timeout(3000)
        });
        if (response.ok) {
            return await response.json();
        }
    } catch {
        // Bridge not running, fall back to session file
    }

    try {
        if (existsSync(SESSION_FILE)) {
            const session = JSON.parse(readFileSync(SESSION_FILE, 'utf-8'));
            return {
                ...session,
                bridgeRunning: false,
                error: 'Bridge WhatsApp não está rodando. Execute: pm2 start ecosystem.config.js'
            };
        }
    } catch (_e) {
        console.error('Error reading session:', _e);
    }

    return {
        status: 'DISCONNECTED',
        qrCode: null,
        connectedAt: null,
        bridgeRunning: false,
        error: 'Bridge WhatsApp não está rodando'
    };
}

export async function GET() {
    const status = await getBridgeStatus();
    return NextResponse.json(status);
}
