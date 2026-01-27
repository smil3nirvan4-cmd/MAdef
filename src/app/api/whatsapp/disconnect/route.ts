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
        const response = await fetch(`http://localhost:${bridgePort}/disconnect`, {
            method: 'POST',
            signal: AbortSignal.timeout(10000)
        });

        if (response.ok) {
            return NextResponse.json(await response.json());
        }

        return NextResponse.json({ success: false, error: 'Bridge error' }, { status: 500 });
    } catch {
        return NextResponse.json(
            { success: false, error: 'Bridge não está rodando' },
            { status: 500 }
        );
    }
}
