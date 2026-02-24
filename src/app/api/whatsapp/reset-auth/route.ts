import { NextRequest, NextResponse } from 'next/server';
import { resolveBridgeConfig } from '@/lib/whatsapp/bridge-config';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { guardCapability } from '@/lib/auth/capability-guard';

async function handlePost(_request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const bridgeConfig = resolveBridgeConfig();

    try {
        const response = await fetch(`${bridgeConfig.bridgeUrl}/reset-auth`, {
            method: 'POST',
            signal: AbortSignal.timeout(10000),
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
                error: 'Bridge did not respond properly.',
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
                error: 'Bridge is not running.',
            },
            { status: 500 }
        );
    }
}

export const POST = withErrorBoundary(handlePost);
