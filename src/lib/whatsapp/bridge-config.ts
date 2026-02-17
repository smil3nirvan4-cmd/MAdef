import { existsSync, readFileSync } from 'fs';
import path from 'path';

export interface BridgeConfig {
    bridgeUrl: string;
    port: string;
    host: string;
    portFile: string;
    recommendedCommand: string;
}

function getRecommendedCommand(): string {
    return process.env.WA_STANDALONE === 'true' ? 'npm run whatsapp' : 'npm run dev';
}

export function resolveBridgeConfig(): BridgeConfig {
    const host = process.env.WA_BRIDGE_HOST || '127.0.0.1';
    const defaultPort = process.env.WA_BRIDGE_PORT || '4000';
    const portFile = path.resolve(
        process.cwd(),
        process.env.WA_BRIDGE_PORT_FILE || '.wa-bridge-port'
    );

    let port = defaultPort;

    if (existsSync(portFile)) {
        try {
            const fileValue = readFileSync(portFile, 'utf-8').trim();
            if (fileValue) port = fileValue;
        } catch {
            // Keep default port when file cannot be read
        }
    }

    const bridgeUrl = process.env.WA_BRIDGE_URL || `http://${host}:${port}`;

    return {
        bridgeUrl,
        port,
        host,
        portFile,
        recommendedCommand: getRecommendedCommand(),
    };
}
