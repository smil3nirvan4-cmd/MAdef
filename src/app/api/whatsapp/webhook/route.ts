import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/lib/whatsapp/handlers';
import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET;
const ALLOWED_ORIGINS = process.env.WHATSAPP_ALLOWED_ORIGINS?.split(',') || [];

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX_REQUESTS = 100;

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record || now > record.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
        return true;
    }

    if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
        return false;
    }

    record.count++;
    return true;
}

function validateWebhookSignature(request: NextRequest, body: string): boolean {
    const signature = request.headers.get('x-webhook-signature');
    
    if (!WEBHOOK_SECRET) {
        console.warn('WHATSAPP_WEBHOOK_SECRET não configurado - validação de assinatura desabilitada');
        return true;
    }

    if (!signature) {
        return false;
    }

    const expectedSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(body)
        .digest('hex');

    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

function validateOrigin(request: NextRequest): boolean {
    if (ALLOWED_ORIGINS.length === 0) {
        return true;
    }

    const origin = request.headers.get('origin') || request.headers.get('x-forwarded-for') || '';
    return ALLOWED_ORIGINS.some(allowed => origin.includes(allowed));
}

export async function POST(request: NextRequest) {
    try {
        const ip = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';

        if (!checkRateLimit(ip)) {
            return NextResponse.json(
                { success: false, error: 'Rate limit exceeded' },
                { status: 429 }
            );
        }

        if (!validateOrigin(request)) {
            return NextResponse.json(
                { success: false, error: 'Origin not allowed' },
                { status: 403 }
            );
        }

        const bodyText = await request.text();

        if (!validateWebhookSignature(request, bodyText)) {
            return NextResponse.json(
                { success: false, error: 'Invalid signature' },
                { status: 401 }
            );
        }

        const body = JSON.parse(bodyText);

        await handleIncomingMessage(body);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Erro no webhook WhatsApp:', error);
        return NextResponse.json(
            { success: false, error: 'Erro ao processar mensagem' },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({ status: 'ok', service: 'whatsapp-webhook' });
}
