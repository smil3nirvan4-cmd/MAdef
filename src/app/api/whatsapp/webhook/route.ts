import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/lib/whatsapp/handlers';
import { handleConversationMessage } from '@/lib/whatsapp/conversation-bot';
import {
    WEBHOOK_SIGNATURE_HEADER,
    WEBHOOK_TIMESTAMP_HEADER,
    validateWebhookSecurity,
} from '@/lib/whatsapp/webhook-security';
import { withRequestContext } from '@/lib/api/with-request-context';
import { E, fail, ok } from '@/lib/api/response';

const ALLOWED_ORIGINS = process.env.WHATSAPP_ALLOWED_ORIGINS?.split(',').filter(Boolean) || [];
const WEBHOOK_MAX_AGE_SECONDS = Number(process.env.WHATSAPP_WEBHOOK_MAX_AGE_SECONDS || 300);

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 100;

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record || now > record.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
        return true;
    }

    if (record.count >= RATE_LIMIT_MAX_REQUESTS) return false;
    record.count += 1;
    return true;
}

function validateOrigin(request: NextRequest): boolean {
    if (ALLOWED_ORIGINS.length === 0) return true;

    const origin = request.headers.get('origin') || '';
    if (!origin) return false;
    return ALLOWED_ORIGINS.some((allowed) => origin.includes(allowed));
}

function mapWebhookSecurityCode(code: string): string {
    if (code === 'WEBHOOK_TIMESTAMP_EXPIRED') return E.REPLAY_DETECTED;
    if (code === 'WEBHOOK_SIGNATURE_INVALID') return E.INVALID_SIGNATURE;
    if (code === 'WEBHOOK_SIGNATURE_MISSING') return E.INVALID_SIGNATURE;
    if (code === 'WEBHOOK_TIMESTAMP_MISSING') return E.INVALID_SIGNATURE;
    if (code === 'WEBHOOK_TIMESTAMP_INVALID') return E.INVALID_SIGNATURE;
    if (code === 'WEBHOOK_SECRET_MISSING') return E.INTERNAL_ERROR;
    return E.INVALID_SIGNATURE;
}

const postHandler = async (request: NextRequest) => {
    try {
        const ip =
            request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown';

        if (!checkRateLimit(ip)) {
            return fail(E.CONFLICT, 'Rate limit exceeded', { status: 429 });
        }

        if (!validateOrigin(request)) {
            return fail(E.FORBIDDEN, 'Origin not allowed', { status: 403 });
        }

        const bodyText = await request.text();
        const security = validateWebhookSecurity({
            body: bodyText,
            signature: request.headers.get(WEBHOOK_SIGNATURE_HEADER),
            timestamp: request.headers.get(WEBHOOK_TIMESTAMP_HEADER),
            secret: process.env.WHATSAPP_WEBHOOK_SECRET || process.env.WA_WEBHOOK_SECRET,
            requireSecret: process.env.NODE_ENV !== 'development',
            maxAgeSeconds: WEBHOOK_MAX_AGE_SECONDS,
        });

        if (!security.ok) {
            return fail(mapWebhookSecurityCode(security.code), security.error, {
                status: security.status,
                details: { rawCode: security.code },
            });
        }

        let body: any;
        try {
            body = JSON.parse(bodyText);
        } catch {
            return fail(E.VALIDATION_ERROR, 'Invalid JSON payload', { status: 400 });
        }

        const remoteJid = body?.key?.remoteJid;
        if (!remoteJid) {
            return ok({ skipped: true });
        }

        if (body?.key?.fromMe) {
            return ok({ skipped: true });
        }

        const handledByConversation = await handleConversationMessage(body);
        if (handledByConversation) {
            return ok({ handled: 'conversation' });
        }

        await handleIncomingMessage(body);
        return ok({ handled: 'legacy' });
    } catch (error) {
        console.error('[Webhook] error:', error);
        const message = error instanceof Error ? error.message : 'Erro ao processar mensagem';
        return fail(E.INTERNAL_ERROR, message, { status: 500 });
    }
};

const getHandler = async () => {
    return ok({ status: 'ok', service: 'whatsapp-webhook' });
};

export const POST = withRequestContext(postHandler);
export const GET = withRequestContext(getHandler);
