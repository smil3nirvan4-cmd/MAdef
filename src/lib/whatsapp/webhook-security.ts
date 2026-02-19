import crypto from 'crypto';

export const WEBHOOK_SIGNATURE_HEADER = 'x-webhook-signature';
export const WEBHOOK_TIMESTAMP_HEADER = 'x-webhook-timestamp';
export const DEFAULT_WEBHOOK_MAX_AGE_SECONDS = 300;

export interface ValidateWebhookSecurityInput {
    body: string;
    signature: string | null;
    timestamp: string | null;
    secret: string | null | undefined;
    requireSecret: boolean;
    maxAgeSeconds?: number;
    nowMs?: number;
}

export type ValidateWebhookSecurityResult =
    | { ok: true }
    | {
        ok: false;
        status: number;
        code: 'WEBHOOK_SECRET_MISSING' | 'WEBHOOK_SIGNATURE_MISSING' | 'WEBHOOK_TIMESTAMP_MISSING' | 'WEBHOOK_TIMESTAMP_INVALID' | 'WEBHOOK_TIMESTAMP_EXPIRED' | 'WEBHOOK_SIGNATURE_INVALID';
        error: string;
    };

function normalizeSignature(signature: string | null): string | null {
    const trimmed = String(signature || '').trim();
    if (!trimmed) return null;
    return trimmed.startsWith('sha256=') ? trimmed.slice('sha256='.length) : trimmed;
}

function parseTimestampMs(rawTimestamp: string | null): number | null {
    const value = String(rawTimestamp || '').trim();
    if (!value) return null;
    if (!/^\d+$/.test(value)) return null;

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;

    // Suporta segundos (10 digitos) e milissegundos (13 digitos).
    return value.length <= 10 ? parsed * 1000 : parsed;
}

function timingSafeEqualHex(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left, 'utf8');
    const rightBuffer = Buffer.from(right, 'utf8');
    if (leftBuffer.length !== rightBuffer.length) return false;
    return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function signWebhookPayload(secret: string, timestamp: string, body: string): string {
    return crypto
        .createHmac('sha256', secret)
        .update(`${timestamp}.${body}`)
        .digest('hex');
}

export function validateWebhookSecurity(input: ValidateWebhookSecurityInput): ValidateWebhookSecurityResult {
    const secret = String(input.secret || '').trim();
    const requireSecret = input.requireSecret;

    if (!secret) {
        if (requireSecret) {
            return {
                ok: false,
                status: 500,
                code: 'WEBHOOK_SECRET_MISSING',
                error: 'Webhook secret is required outside development.',
            };
        }
        return { ok: true };
    }

    const signature = normalizeSignature(input.signature);
    if (!signature) {
        return {
            ok: false,
            status: 401,
            code: 'WEBHOOK_SIGNATURE_MISSING',
            error: 'Missing webhook signature.',
        };
    }

    const timestamp = String(input.timestamp || '').trim();
    if (!timestamp) {
        return {
            ok: false,
            status: 401,
            code: 'WEBHOOK_TIMESTAMP_MISSING',
            error: 'Missing webhook timestamp.',
        };
    }

    const timestampMs = parseTimestampMs(timestamp);
    if (!timestampMs) {
        return {
            ok: false,
            status: 401,
            code: 'WEBHOOK_TIMESTAMP_INVALID',
            error: 'Invalid webhook timestamp.',
        };
    }

    const nowMs = input.nowMs ?? Date.now();
    const maxAgeSeconds = Number.isFinite(input.maxAgeSeconds)
        ? Number(input.maxAgeSeconds)
        : DEFAULT_WEBHOOK_MAX_AGE_SECONDS;
    const maxAgeMs = Math.max(1, maxAgeSeconds) * 1000;

    if (Math.abs(nowMs - timestampMs) > maxAgeMs) {
        return {
            ok: false,
            status: 401,
            code: 'WEBHOOK_TIMESTAMP_EXPIRED',
            error: 'Webhook timestamp outside allowed replay window.',
        };
    }

    const expected = signWebhookPayload(secret, timestamp, input.body);
    if (!timingSafeEqualHex(signature, expected)) {
        return {
            ok: false,
            status: 401,
            code: 'WEBHOOK_SIGNATURE_INVALID',
            error: 'Invalid webhook signature.',
        };
    }

    return { ok: true };
}
