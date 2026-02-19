import { describe, expect, it } from 'vitest';
import { signWebhookPayload, validateWebhookSecurity } from './webhook-security';

const NOW_MS = Date.UTC(2026, 1, 17, 15, 0, 0);
const BODY = JSON.stringify({ key: { remoteJid: '5511999999999@s.whatsapp.net' } });
const SECRET = 'super-secret';

describe('validateWebhookSecurity', () => {
    it('fails when secret is required and missing', () => {
        const result = validateWebhookSecurity({
            body: BODY,
            signature: null,
            timestamp: null,
            secret: null,
            requireSecret: true,
            nowMs: NOW_MS,
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.code).toBe('WEBHOOK_SECRET_MISSING');
            expect(result.status).toBe(500);
        }
    });

    it('fails when signature is invalid', () => {
        const timestamp = String(Math.floor(NOW_MS / 1000));
        const result = validateWebhookSecurity({
            body: BODY,
            signature: 'sha256=invalid',
            timestamp,
            secret: SECRET,
            requireSecret: true,
            nowMs: NOW_MS,
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.code).toBe('WEBHOOK_SIGNATURE_INVALID');
            expect(result.status).toBe(401);
        }
    });

    it('fails when timestamp is outside replay window', () => {
        const oldTimestamp = String(Math.floor((NOW_MS - (10 * 60 * 1000)) / 1000));
        const signature = signWebhookPayload(SECRET, oldTimestamp, BODY);

        const result = validateWebhookSecurity({
            body: BODY,
            signature: `sha256=${signature}`,
            timestamp: oldTimestamp,
            secret: SECRET,
            requireSecret: true,
            maxAgeSeconds: 300,
            nowMs: NOW_MS,
        });

        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.code).toBe('WEBHOOK_TIMESTAMP_EXPIRED');
            expect(result.status).toBe(401);
        }
    });

    it('accepts valid signature and timestamp', () => {
        const timestamp = String(Math.floor(NOW_MS / 1000));
        const signature = signWebhookPayload(SECRET, timestamp, BODY);

        const result = validateWebhookSecurity({
            body: BODY,
            signature: `sha256=${signature}`,
            timestamp,
            secret: SECRET,
            requireSecret: true,
            maxAgeSeconds: 300,
            nowMs: NOW_MS,
        });

        expect(result).toEqual({ ok: true });
    });

    it('accepts unsigned webhook in development when secret is not configured', () => {
        const result = validateWebhookSecurity({
            body: BODY,
            signature: null,
            timestamp: null,
            secret: '',
            requireSecret: false,
            nowMs: NOW_MS,
        });

        expect(result).toEqual({ ok: true });
    });
});
