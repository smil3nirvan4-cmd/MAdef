import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

export async function POST() {
    const portFile = path.join(process.cwd(), '.wa-bridge-port');
    let bridgePort = '4000';

    if (existsSync(portFile)) {
        bridgePort = readFileSync(portFile, 'utf-8').trim();
    }

    try {
        const response = await fetch(`http://localhost:${bridgePort}/connect`, {
            method: 'POST',
            signal: AbortSignal.timeout(10000)
        });

        if (response.ok) {
            const data = await response.json();
            return NextResponse.json(data);
        }

        return NextResponse.json(
            { success: false, error: 'Bridge não respondeu' },
            { status: 500 }
        );
    } catch {
        return NextResponse.json(
            {
                success: false,
                error: 'Bridge WhatsApp não está rodando. Execute: pm2 start ecosystem.config.js',
                bridgeRunning: false
            },
            { status: 500 }
        );
    }
}
