import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { resolveBridgeConfig } from '@/lib/whatsapp/bridge-config';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { guardCapability } from '@/lib/auth/capability-guard';

const SESSION_FILE = path.resolve(
    process.cwd(),
    process.env.WA_SESSION_FILE || '.wa-session.json'
);

async function getBridgeStatus() {
    const bridgeConfig = resolveBridgeConfig();

    try {
        const response = await fetch(`${bridgeConfig.bridgeUrl}/status`, {
            signal: AbortSignal.timeout(3000)
        });

        const payload: any = await response.json().catch(() => null);

        if (response.ok && payload && typeof payload === 'object') {
            return {
                ...payload,
                connected: Boolean(payload.connected ?? payload.status === 'CONNECTED'),
                bridgeRunning: true,
                recommendedCommand: bridgeConfig.recommendedCommand,
                bridgeUrlResolved: bridgeConfig.bridgeUrl,
                bridgePortResolved: bridgeConfig.port,
            };
        }

        return {
            status: payload?.status || 'DISCONNECTED',
            connected: Boolean(payload?.connected),
            qrCode: payload?.qrCode || null,
            connectedAt: payload?.connectedAt || null,
            phone: payload?.phone || null,
            bridgeRunning: true,
            recommendedCommand: bridgeConfig.recommendedCommand,
            bridgeUrlResolved: bridgeConfig.bridgeUrl,
            bridgePortResolved: bridgeConfig.port,
            error: `Bridge returned HTTP ${response.status}.`
        };
    } catch {
        // Bridge not reachable, fall back to local session state.
    }

    try {
        if (existsSync(SESSION_FILE)) {
            const session: any = JSON.parse(readFileSync(SESSION_FILE, 'utf-8'));
            return {
                status: session.status || 'DISCONNECTED',
                connected: Boolean(session.connected ?? session.status === 'CONNECTED'),
                qrCode: session.qrCode || null,
                connectedAt: session.connectedAt || null,
                phone: session.phone || null,
                bridgeRunning: false,
                recommendedCommand: resolveBridgeConfig().recommendedCommand,
                bridgeUrlResolved: resolveBridgeConfig().bridgeUrl,
                bridgePortResolved: resolveBridgeConfig().port,
                error: 'Bridge is not running.'
            };
        }
    } catch (error) {
        console.error('Error reading WhatsApp session:', error);
    }

    const config = resolveBridgeConfig();
    return {
        status: 'DISCONNECTED',
        connected: false,
        qrCode: null,
        connectedAt: null,
        phone: null,
        bridgeRunning: false,
        recommendedCommand: config.recommendedCommand,
        bridgeUrlResolved: config.bridgeUrl,
        bridgePortResolved: config.port,
        error: 'Bridge is not running.'
    };
}

async function handleGet(_request: NextRequest) {
    const guard = await guardCapability('VIEW_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const status = await getBridgeStatus();
    return NextResponse.json(status);
}

export const GET = withErrorBoundary(handleGet);
