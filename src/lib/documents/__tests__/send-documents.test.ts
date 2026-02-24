import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────
vi.mock('@/lib/logger', () => ({
    default: { warning: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@/lib/phone-validator', () => ({
    normalizeOutboundPhoneBR: vi.fn(),
}));

vi.mock('@/lib/whatsapp/bridge-config', () => ({
    resolveBridgeConfig: vi.fn().mockReturnValue({
        bridgeUrl: 'http://127.0.0.1:4000',
        port: '4000',
        host: '127.0.0.1',
        portFile: '.wa-bridge-port',
        recommendedCommand: 'npm run dev',
    }),
}));

vi.mock('@/lib/whatsapp/circuit-breaker', () => ({
    whatsappCircuitBreaker: {
        isOpen: vi.fn().mockReturnValue(false),
        recordFailure: vi.fn(),
        recordSuccess: vi.fn(),
        toJSON: vi.fn().mockReturnValue({ state: 'OPEN' }),
    },
}));

vi.mock('@/lib/whatsapp/provider-message-id', () => ({
    extractProviderMessageId: vi.fn(),
}));

// ── Imports ────────────────────────────────────────────────────
import { sendDocumentViaBridge } from '../whatsapp-documents';
import { normalizeOutboundPhoneBR } from '@/lib/phone-validator';
import { whatsappCircuitBreaker } from '@/lib/whatsapp/circuit-breaker';
import { extractProviderMessageId } from '@/lib/whatsapp/provider-message-id';
import logger from '@/lib/logger';

// ── Helpers ────────────────────────────────────────────────────
const baseParams = {
    phone: '11999990000',
    fileName: 'doc.pdf',
    caption: 'Test document',
    buffer: Buffer.from('pdf-content'),
};

function mockValidPhone() {
    vi.mocked(normalizeOutboundPhoneBR).mockReturnValue({
        isValid: true,
        e164: '+5511999990000',
        jid: '5511999990000@s.whatsapp.net',
        formatted: '(11) 99999-0000',
        type: 'celular',
    });
}

function mockFixoPhone() {
    vi.mocked(normalizeOutboundPhoneBR).mockReturnValue({
        isValid: true,
        e164: '+551133330000',
        jid: '551133330000@s.whatsapp.net',
        formatted: '(11) 3333-0000',
        type: 'fixo',
    });
}

function mockInvalidPhone() {
    vi.mocked(normalizeOutboundPhoneBR).mockReturnValue({
        isValid: false,
        e164: '',
        jid: '',
        formatted: '',
        type: 'invalido',
        error: 'Numero invalido',
    });
}

// ── Tests ──────────────────────────────────────────────────────
beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(whatsappCircuitBreaker.isOpen).mockReturnValue(false);
    vi.stubGlobal('fetch', vi.fn());
});

describe('sendDocumentViaBridge', () => {
    // ── Invalid phone ──────────────────────────────────────────
    describe('invalid phone', () => {
        it('returns FAILED with INVALID_PHONE when phone is invalid', async () => {
            mockInvalidPhone();

            const result = await sendDocumentViaBridge(baseParams);

            expect(result.success).toBe(false);
            expect(result.deliveryStatus).toBe('FAILED');
            expect(result.errorCode).toBe('INVALID_PHONE');
            expect(result.error).toBe('Numero invalido');
        });

        it('returns generic error message when normalizer provides no error', async () => {
            vi.mocked(normalizeOutboundPhoneBR).mockReturnValue({
                isValid: false,
                e164: '',
                jid: '',
                formatted: '',
                type: 'invalido',
            });

            const result = await sendDocumentViaBridge(baseParams);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Telefone invalido');
        });
    });

    // ── Non-celular (fixo) phone ───────────────────────────────
    describe('non-celular phone', () => {
        it('returns FAILED with INVALID_PHONE when phone is fixo', async () => {
            mockFixoPhone();

            const result = await sendDocumentViaBridge(baseParams);

            expect(result.success).toBe(false);
            expect(result.deliveryStatus).toBe('FAILED');
            expect(result.errorCode).toBe('INVALID_PHONE');
            expect(result.error).toBe('WhatsApp requer numero de celular');
            expect(result.e164).toBe('+551133330000');
            expect(result.jid).toBe('551133330000@s.whatsapp.net');
        });
    });

    // ── Circuit breaker open ───────────────────────────────────
    describe('circuit breaker open', () => {
        it('returns FAILED with CIRCUIT_OPEN error', async () => {
            mockValidPhone();
            vi.mocked(whatsappCircuitBreaker.isOpen).mockReturnValue(true);

            const result = await sendDocumentViaBridge(baseParams);

            expect(result.success).toBe(false);
            expect(result.deliveryStatus).toBe('FAILED');
            expect(result.errorCode).toBe('CIRCUIT_OPEN');
            expect(result.circuitState).toEqual({ state: 'OPEN' });
        });

        it('does NOT call recordFailure when circuit is already open', async () => {
            mockValidPhone();
            vi.mocked(whatsappCircuitBreaker.isOpen).mockReturnValue(true);

            await sendDocumentViaBridge(baseParams);

            expect(whatsappCircuitBreaker.recordFailure).not.toHaveBeenCalled();
        });
    });

    // ── Bridge HTTP error ──────────────────────────────────────
    describe('bridge HTTP error', () => {
        it('returns FAILED with BRIDGE_UNAVAILABLE on 5xx', async () => {
            mockValidPhone();
            vi.mocked(extractProviderMessageId).mockReturnValue(null);
            vi.mocked(fetch).mockResolvedValue({
                ok: false,
                status: 503,
                json: vi.fn().mockResolvedValue({ error: 'Service Unavailable' }),
            } as any);

            const result = await sendDocumentViaBridge(baseParams);

            expect(result.success).toBe(false);
            expect(result.deliveryStatus).toBe('FAILED');
            expect(result.errorCode).toBe('BRIDGE_UNAVAILABLE');
            expect(result.statusCode).toBe(503);
            expect(result.bridgeAccepted).toBe(false);
            expect(whatsappCircuitBreaker.recordFailure).toHaveBeenCalledWith(503);
        });

        it('returns PROVIDER_ERROR on 4xx', async () => {
            mockValidPhone();
            vi.mocked(extractProviderMessageId).mockReturnValue(null);
            vi.mocked(fetch).mockResolvedValue({
                ok: false,
                status: 400,
                json: vi.fn().mockResolvedValue({ error: 'Bad Request', code: 'BAD_REQUEST' }),
            } as any);

            const result = await sendDocumentViaBridge(baseParams);

            expect(result.success).toBe(false);
            expect(result.errorCode).toBe('BAD_REQUEST');
            expect(result.statusCode).toBe(400);
            expect(whatsappCircuitBreaker.recordFailure).not.toHaveBeenCalled();
        });

        it('handles json parse failure gracefully', async () => {
            mockValidPhone();
            vi.mocked(extractProviderMessageId).mockReturnValue(null);
            vi.mocked(fetch).mockResolvedValue({
                ok: false,
                status: 500,
                json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
            } as any);

            const result = await sendDocumentViaBridge(baseParams);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Bridge error HTTP 500');
            expect(whatsappCircuitBreaker.recordFailure).toHaveBeenCalledWith(500);
        });

        it('treats response with success:false as failure even if ok', async () => {
            mockValidPhone();
            vi.mocked(extractProviderMessageId).mockReturnValue(null);
            vi.mocked(fetch).mockResolvedValue({
                ok: true,
                status: 200,
                json: vi.fn().mockResolvedValue({ success: false, error: 'Not delivered' }),
            } as any);

            const result = await sendDocumentViaBridge(baseParams);

            expect(result.success).toBe(false);
            expect(result.deliveryStatus).toBe('FAILED');
            expect(result.error).toBe('Not delivered');
        });
    });

    // ── Success without messageId (UNCONFIRMED) ────────────────
    describe('success without messageId', () => {
        it('returns UNCONFIRMED and records failure', async () => {
            mockValidPhone();
            vi.mocked(extractProviderMessageId).mockReturnValue(null);
            vi.mocked(fetch).mockResolvedValue({
                ok: true,
                status: 200,
                json: vi.fn().mockResolvedValue({ success: true }),
            } as any);

            const result = await sendDocumentViaBridge(baseParams);

            expect(result.success).toBe(false);
            expect(result.deliveryStatus).toBe('UNCONFIRMED');
            expect(result.bridgeAccepted).toBe(true);
            expect(result.errorCode).toBe('UNCONFIRMED_SEND');
            expect(whatsappCircuitBreaker.recordFailure).toHaveBeenCalledWith(503);
            expect(logger.warning).toHaveBeenCalledWith(
                'whatsapp_document_unconfirmed',
                expect.any(String),
                expect.objectContaining({
                    phone: '11999990000',
                    fileName: 'doc.pdf',
                }),
            );
        });
    });

    // ── Successful send ────────────────────────────────────────
    describe('successful send', () => {
        it('returns SENT_CONFIRMED with messageId', async () => {
            mockValidPhone();
            vi.mocked(extractProviderMessageId).mockReturnValue('msg-abc123');
            vi.mocked(fetch).mockResolvedValue({
                ok: true,
                status: 200,
                json: vi.fn().mockResolvedValue({
                    success: true,
                    messageId: 'msg-abc123',
                }),
            } as any);

            const result = await sendDocumentViaBridge(baseParams);

            expect(result.success).toBe(true);
            expect(result.deliveryStatus).toBe('SENT_CONFIRMED');
            expect(result.bridgeAccepted).toBe(true);
            expect(result.messageId).toBe('msg-abc123');
            expect(result.e164).toBe('+5511999990000');
            expect(result.jid).toBe('5511999990000@s.whatsapp.net');
            expect(whatsappCircuitBreaker.recordSuccess).toHaveBeenCalled();
        });

        it('sends correct payload to bridge', async () => {
            mockValidPhone();
            vi.mocked(extractProviderMessageId).mockReturnValue('msg-id');
            vi.mocked(fetch).mockResolvedValue({
                ok: true,
                status: 200,
                json: vi.fn().mockResolvedValue({ success: true, messageId: 'msg-id' }),
            } as any);

            await sendDocumentViaBridge(baseParams);

            expect(fetch).toHaveBeenCalledWith(
                'http://127.0.0.1:4000/send-document',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        to: '5511999990000@s.whatsapp.net',
                        document: Buffer.from('pdf-content').toString('base64'),
                        fileName: 'doc.pdf',
                        caption: 'Test document',
                        mimetype: 'application/pdf',
                    }),
                }),
            );
        });
    });

    // ── Fetch/network error ────────────────────────────────────
    describe('network error', () => {
        it('returns FAILED with INTERNAL_ERROR on fetch error', async () => {
            mockValidPhone();
            vi.mocked(fetch).mockRejectedValue(new Error('Connection refused'));

            const result = await sendDocumentViaBridge(baseParams);

            expect(result.success).toBe(false);
            expect(result.deliveryStatus).toBe('FAILED');
            expect(result.error).toBe('Connection refused');
            expect(result.errorCode).toBe('INTERNAL_ERROR');
            expect(whatsappCircuitBreaker.recordFailure).toHaveBeenCalled();
        });

        it('preserves error.code if present', async () => {
            mockValidPhone();
            const err = Object.assign(new Error('Timed out'), { code: 'ETIMEDOUT' });
            vi.mocked(fetch).mockRejectedValue(err);

            const result = await sendDocumentViaBridge(baseParams);

            expect(result.errorCode).toBe('ETIMEDOUT');
        });

        it('returns generic message when error has no message', async () => {
            mockValidPhone();
            vi.mocked(fetch).mockRejectedValue({});

            const result = await sendDocumentViaBridge(baseParams);

            expect(result.error).toBe('Falha ao enviar documento');
            expect(result.errorCode).toBe('INTERNAL_ERROR');
        });
    });

    // ── recommendedCommand ─────────────────────────────────────
    it('always includes recommendedCommand', async () => {
        mockValidPhone();
        vi.mocked(extractProviderMessageId).mockReturnValue('msg-1');
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            status: 200,
            json: vi.fn().mockResolvedValue({ success: true }),
        } as any);

        const result = await sendDocumentViaBridge(baseParams);

        expect(result.recommendedCommand).toBe('npm run dev');
    });
});
