import { NextRequest, NextResponse } from 'next/server';
import { resolveBridgeConfig } from '@/lib/whatsapp/bridge-config';
import { parseBody } from '@/lib/api/parse-body';
import { pairSchema } from '@/lib/validations/whatsapp';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';

async function handlePost(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const bridgeConfig = resolveBridgeConfig();

    const result = await parseBody(request, pairSchema);
    const body = result.data ?? {};

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

export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 5, windowMs: 60_000 });
