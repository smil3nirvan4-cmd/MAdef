import { NextResponse } from 'next/server';
import { resolveBridgeConfig } from '@/lib/whatsapp/bridge-config';

export async function POST() {
    const bridgeConfig = resolveBridgeConfig();

    try {
        const response = await fetch(`${bridgeConfig.bridgeUrl}/disconnect`, {
            method: 'POST',
            signal: AbortSignal.timeout(10000)
        });

        if (response.ok) {
            const data = await response.json();
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
                error: 'Bridge did not respond properly.'
            },
            { status: 500 }
        );
    } catch {
        return NextResponse.json(
            {
                success: false,
                bridgeRunning: false,
                recommendedCommand: bridgeConfig.recommendedCommand,
                bridgeUrlResolved: bridgeConfig.bridgeUrl,
                bridgePortResolved: bridgeConfig.port,
                error: 'Bridge is not running.'
            },
            { status: 500 }
        );
    }
}
