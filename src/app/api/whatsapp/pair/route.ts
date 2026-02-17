import { NextRequest, NextResponse } from 'next/server';
import { resolveBridgeConfig } from '@/lib/whatsapp/bridge-config';

export async function POST(request: NextRequest) {
    const bridgeConfig = resolveBridgeConfig();

    let body: any = {};
    try {
        body = await request.json();
    } catch {
        body = {};
    }

    try {
        const response = await fetch(`${bridgeConfig.bridgeUrl}/pair`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: body?.phone }),
            signal: AbortSignal.timeout(10000),
        });

        const data: any = await response.json().catch(() => ({}));

        if (response.ok) {
            return NextResponse.json({
                ...data,
                bridgeRunning: true,
                recommendedCommand: bridgeConfig.recommendedCommand,
                bridgeUrlResolved: bridgeConfig.bridgeUrl,
                bridgePortResolved: bridgeConfig.port,
            });
        }

        return NextResponse.json(
            {
                success: false,
                bridgeRunning: true,
                recommendedCommand: bridgeConfig.recommendedCommand,
                bridgeUrlResolved: bridgeConfig.bridgeUrl,
                bridgePortResolved: bridgeConfig.port,
                error: data?.error || 'Bridge did not respond properly.',
            },
            { status: response.status || 500 }
        );
    } catch {
        return NextResponse.json(
            {
                success: false,
                bridgeRunning: false,
                recommendedCommand: bridgeConfig.recommendedCommand,
                bridgeUrlResolved: bridgeConfig.bridgeUrl,
                bridgePortResolved: bridgeConfig.port,
                error: 'Bridge is not running.',
            },
            { status: 500 }
        );
    }
}
