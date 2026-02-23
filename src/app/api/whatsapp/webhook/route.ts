import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/lib/whatsapp/handlers';
import { handleConversationMessage } from '@/lib/whatsapp/conversation-bot';
import {
    WEBHOOK_SIGNATURE_HEADER,
    WEBHOOK_TIMESTAMP_HEADER,
    validateWebhookSecurity,
} from '@/lib/whatsapp/webhook-security';
import { withRequestContext } from '@/lib/api/with-request-context';
import { checkRateLimit, getClientIp } from '@/lib/api/rate-limit';
import { E, fail, ok } from '@/lib/api/response';
import logger from '@/lib/observability/logger';

const ALLOWED_ORIGINS = process.env.WHATSAPP_ALLOWED_ORIGINS?.split(',').filter(Boolean) || [];
const WEBHOOK_MAX_AGE_SECONDS = Number(process.env.WHATSAPP_WEBHOOK_MAX_AGE_SECONDS || 300);
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 100;

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
        const ip = getClientIp(request);

        const rateResult = checkRateLimit(`webhook:${ip}`, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MS);
        if (!rateResult.allowed) {
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

        let body: Record<string, unknown>;
        try {
            const parsed = JSON.parse(bodyText);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                return fail(E.VALIDATION_ERROR, 'Payload must be a JSON object', { status: 400 });
            }
            body = parsed as Record<string, unknown>;
        } catch {
            return fail(E.VALIDATION_ERROR, 'Invalid JSON payload', { status: 400 });
        }

        const key = body.key as Record<string, unknown> | undefined;
        const remoteJid = key?.remoteJid;
        if (!remoteJid) {
            return ok({ skipped: true });
        }

        if (key?.fromMe) {
            return ok({ skipped: true });
        }

        const handledByConversation = await handleConversationMessage(body);
        if (handledByConversation) {
            return ok({ handled: 'conversation' });
        }

        await handleIncomingMessage(body);
        return ok({ handled: 'legacy' });
    } catch (error) {
        await logger.error('webhook_erro', 'Erro ao processar mensagem do webhook', error instanceof Error ? error : undefined);
        const message = error instanceof Error ? error.message : 'Erro ao processar mensagem';
        return fail(E.INTERNAL_ERROR, message, { status: 500 });
    }
};

const getHandler = async () => {
    return ok({ status: 'ok', service: 'whatsapp-webhook' });
};

export const POST = withRequestContext(postHandler);
export const GET = withRequestContext(getHandler);
