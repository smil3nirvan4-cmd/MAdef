import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be declared BEFORE importing the module under test, because
// `whatsappSender` is instantiated at module-load time.
// ---------------------------------------------------------------------------

vi.mock('../phone-validator', () => ({
    normalizeOutboundPhoneBR: vi.fn(),
}));

vi.mock('../logger', () => ({
    default: {
        whatsapp: vi.fn().mockResolvedValue(undefined),
        warning: vi.fn().mockResolvedValue(undefined),
        error: vi.fn().mockResolvedValue(undefined),
        info: vi.fn().mockResolvedValue(undefined),
        debug: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('../whatsapp/bridge-config', () => ({
    resolveBridgeConfig: vi.fn().mockReturnValue({
        bridgeUrl: 'http://127.0.0.1:4000',
        recommendedCommand: 'npm run dev',
    }),
}));

vi.mock('../whatsapp/provider-message-id', () => ({
    extractProviderMessageId: vi.fn(),
}));

vi.mock('../whatsapp/circuit-breaker', () => ({
    whatsappCircuitBreaker: {
        isOpen: vi.fn().mockReturnValue(false),
        recordSuccess: vi.fn(),
        recordFailure: vi.fn(),
        toJSON: vi.fn().mockReturnValue({
            state: 'CLOSED',
            failureCount: 0,
            lastFailureAt: null,
            openUntil: null,
        }),
    },
}));

// Stub global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
    buildAvaliacaoPropostaMessage,
    whatsappSender,
} from '../whatsapp-sender';
import { normalizeOutboundPhoneBR } from '../phone-validator';
import { extractProviderMessageId } from '../whatsapp/provider-message-id';
import { whatsappCircuitBreaker } from '../whatsapp/circuit-breaker';

// Typed references to the mocked functions
const mockNormalize = normalizeOutboundPhoneBR as ReturnType<typeof vi.fn>;
const mockExtractId = extractProviderMessageId as ReturnType<typeof vi.fn>;
const mockCircuitBreaker = whatsappCircuitBreaker as unknown as {
    isOpen: ReturnType<typeof vi.fn>;
    recordSuccess: ReturnType<typeof vi.fn>;
    recordFailure: ReturnType<typeof vi.fn>;
    toJSON: ReturnType<typeof vi.fn>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validCelularResult(overrides = {}) {
    return {
        isValid: true,
        type: 'celular' as const,
        formatted: '(11) 99999-9999',
        e164: '5511999999999',
        jid: '5511999999999@s.whatsapp.net',
        ...overrides,
    };
}

function invalidPhoneResult(error = 'Numero muito curto. Informe DDD + numero') {
    return {
        isValid: false,
        type: 'invalido' as const,
        formatted: '',
        e164: '',
        jid: '',
        error,
    };
}

function fixoPhoneResult() {
    return {
        isValid: true,
        type: 'fixo' as const,
        formatted: '(11) 3333-4444',
        e164: '551133334444',
        jid: '551133334444@s.whatsapp.net',
    };
}

function bridgeJsonResponse(body: unknown, status = 200, ok = true) {
    return Promise.resolve({
        ok,
        status,
        json: () => Promise.resolve(body),
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockCircuitBreaker.isOpen.mockReturnValue(false);
});

// ===== buildAvaliacaoPropostaMessage =======================================

describe('buildAvaliacaoPropostaMessage', () => {
    it('returns message with patient name and truncated avaliacao code', () => {
        const msg = buildAvaliacaoPropostaMessage({
            pacienteNome: 'Maria Silva',
            avaliacaoId: 'clxyz12345678abcdef90',
        });

        expect(msg).toContain('*Maos Amigas - Home Care*');
        expect(msg).toContain('Ola *Maria Silva*!');
        // Last 8 chars of 'clxyz12345678abcdef90' → 'BCDEF90' upper-cased
        const expectedCode = 'clxyz12345678abcdef90'.slice(-8).toUpperCase();
        expect(msg).toContain(`*Codigo:* ${expectedCode}`);
        expect(msg).toContain('_Equipe Maos Amigas_');
    });

    it('includes valor when provided', () => {
        const msg = buildAvaliacaoPropostaMessage({
            pacienteNome: 'Joao',
            avaliacaoId: 'abc12345678',
            valorProposto: 'R$ 1.500,00',
        });

        expect(msg).toContain('*Valor da Proposta:* R$ 1.500,00');
    });

    it('omits valor line when not provided', () => {
        const msg = buildAvaliacaoPropostaMessage({
            pacienteNome: 'Joao',
            avaliacaoId: 'abc12345678',
        });

        expect(msg).not.toContain('Valor da Proposta');
    });
});

// ===== checkConnection =====================================================

describe('whatsappSender.checkConnection', () => {
    it('returns connected true when bridge responds with connected: true', async () => {
        mockFetch.mockReturnValue(bridgeJsonResponse({ connected: true }));

        const result = await whatsappSender.checkConnection();

        expect(result.connected).toBe(true);
        expect(result.error).toBeUndefined();
        expect(mockFetch).toHaveBeenCalledWith(
            'http://127.0.0.1:4000/status',
            expect.objectContaining({ method: 'GET' }),
        );
    });

    it('returns connected false when bridge responds not ok', async () => {
        mockFetch.mockReturnValue(
            Promise.resolve({
                ok: false,
                status: 503,
                json: () => Promise.resolve({}),
            }),
        );

        const result = await whatsappSender.checkConnection();

        expect(result.connected).toBe(false);
        expect(result.error).toBe('Bridge did not respond.');
        expect(result.recommendedCommand).toBe('npm run dev');
    });

    it('returns connected false with error when fetch throws', async () => {
        mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

        const result = await whatsappSender.checkConnection();

        expect(result.connected).toBe(false);
        expect(result.error).toContain('Bridge offline');
        expect(result.recommendedCommand).toBe('npm run dev');
    });
});

// ===== sendText ============================================================

describe('whatsappSender.sendText', () => {
    it('returns FAILED when phone is invalid', async () => {
        mockNormalize.mockReturnValue(invalidPhoneResult('Numero muito curto'));

        const result = await whatsappSender.sendText('123', 'Ola');

        expect(result.success).toBe(false);
        expect(result.deliveryStatus).toBe('FAILED');
        expect(result.error).toBe('Numero muito curto');
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns FAILED when phone is not celular type', async () => {
        mockNormalize.mockReturnValue(fixoPhoneResult());

        const result = await whatsappSender.sendText('1133334444', 'Ola');

        expect(result.success).toBe(false);
        expect(result.deliveryStatus).toBe('FAILED');
        expect(result.error).toBe('WhatsApp requer numero de celular');
        expect(result.phoneFormatted).toBe('(11) 3333-4444');
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns FAILED when circuit breaker is open', async () => {
        mockNormalize.mockReturnValue(validCelularResult());
        mockCircuitBreaker.isOpen.mockReturnValue(true);
        mockCircuitBreaker.toJSON.mockReturnValue({
            state: 'OPEN',
            failureCount: 5,
            lastFailureAt: new Date().toISOString(),
            openUntil: new Date(Date.now() + 60000).toISOString(),
        });

        const result = await whatsappSender.sendText('11999999999', 'Ola');

        expect(result.success).toBe(false);
        expect(result.deliveryStatus).toBe('FAILED');
        expect(result.errorCode).toBe('CIRCUIT_OPEN');
        expect(result.circuitState).toBeDefined();
        expect(result.recommendedCommand).toBe('npm run dev');
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns SENT_CONFIRMED when bridge succeeds with messageId', async () => {
        mockNormalize.mockReturnValue(validCelularResult());
        const bridgePayload = { success: true, messageId: 'msg-abc-123' };
        mockFetch.mockReturnValue(bridgeJsonResponse(bridgePayload));
        mockExtractId.mockReturnValue('msg-abc-123');

        const result = await whatsappSender.sendText('11999999999', 'Ola');

        expect(result.success).toBe(true);
        expect(result.deliveryStatus).toBe('SENT_CONFIRMED');
        expect(result.bridgeAccepted).toBe(true);
        expect(result.messageId).toBe('msg-abc-123');
        expect(result.phoneFormatted).toBe('(11) 99999-9999');
        expect(mockCircuitBreaker.recordSuccess).toHaveBeenCalled();
    });

    it('returns UNCONFIRMED when bridge succeeds but no messageId', async () => {
        mockNormalize.mockReturnValue(validCelularResult());
        const bridgePayload = { success: true };
        mockFetch.mockReturnValue(bridgeJsonResponse(bridgePayload));
        mockExtractId.mockReturnValue(null);

        const result = await whatsappSender.sendText('11999999999', 'Ola');

        expect(result.success).toBe(false);
        expect(result.deliveryStatus).toBe('UNCONFIRMED');
        expect(result.bridgeAccepted).toBe(true);
        expect(result.errorCode).toBe('UNCONFIRMED_SEND');
        expect(result.recommendedCommand).toBe('npm run dev');
        expect(mockCircuitBreaker.recordFailure).toHaveBeenCalledWith(503);
    });

    it('returns FAILED when bridge returns error response', async () => {
        mockNormalize.mockReturnValue(validCelularResult());
        const bridgePayload = { success: false, error: 'not connected', code: 'NOT_CONNECTED' };
        mockFetch.mockReturnValue(bridgeJsonResponse(bridgePayload, 400, false));
        mockExtractId.mockReturnValue(null);

        const result = await whatsappSender.sendText('11999999999', 'Ola');

        expect(result.success).toBe(false);
        expect(result.deliveryStatus).toBe('FAILED');
        expect(result.bridgeAccepted).toBe(false);
        expect(result.error).toBe('not connected');
        expect(result.errorCode).toBe('NOT_CONNECTED');
        expect(result.statusCode).toBe(400);
    });

    it('returns FAILED with BRIDGE_UNAVAILABLE when fetch throws ECONNREFUSED', async () => {
        mockNormalize.mockReturnValue(validCelularResult());
        mockFetch.mockRejectedValue(new Error('fetch failed: ECONNREFUSED'));

        const result = await whatsappSender.sendText('11999999999', 'Ola');

        expect(result.success).toBe(false);
        expect(result.deliveryStatus).toBe('FAILED');
        expect(result.error).toBe('WhatsApp bridge is offline.');
        expect(result.errorCode).toBe('BRIDGE_UNAVAILABLE');
        expect(result.recommendedCommand).toBe('npm run dev');
        expect(mockCircuitBreaker.recordFailure).toHaveBeenCalled();
    });

    it('returns FAILED with generic error for other exceptions', async () => {
        mockNormalize.mockReturnValue(validCelularResult());
        mockFetch.mockRejectedValue(new Error('Unexpected timeout'));

        const result = await whatsappSender.sendText('11999999999', 'Ola');

        expect(result.success).toBe(false);
        expect(result.deliveryStatus).toBe('FAILED');
        expect(result.error).toBe('Unexpected timeout');
        expect(result.errorCode).toBe('INTERNAL_ERROR');
        expect(mockCircuitBreaker.recordFailure).toHaveBeenCalled();
    });
});

// ===== enviarProposta ======================================================

describe('whatsappSender.enviarProposta', () => {
    it('returns FAILED for invalid phone', async () => {
        mockNormalize.mockReturnValue(invalidPhoneResult('DDD 00 invalido'));

        const result = await whatsappSender.enviarProposta({
            pacienteNome: 'Maria',
            pacienteTelefone: '0012345678',
            avaliacaoId: 'aval-123456789',
        });

        expect(result.success).toBe(false);
        expect(result.deliveryStatus).toBe('FAILED');
        expect(result.error).toContain('Telefone invalido');
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('calls sendText with built message on valid phone', async () => {
        // First call to normalizeOutboundPhoneBR is from enviarProposta (validation)
        // Second call is from sendText (inner validation)
        mockNormalize.mockReturnValue(validCelularResult());

        const bridgePayload = { success: true, messageId: 'msg-prop-1' };
        mockFetch.mockReturnValue(bridgeJsonResponse(bridgePayload));
        mockExtractId.mockReturnValue('msg-prop-1');

        const result = await whatsappSender.enviarProposta({
            pacienteNome: 'Ana Costa',
            pacienteTelefone: '11999999999',
            avaliacaoId: 'aval-abc12345678',
            valorProposto: 'R$ 2.000,00',
        });

        expect(result.success).toBe(true);
        expect(result.deliveryStatus).toBe('SENT_CONFIRMED');
        expect(result.messageId).toBe('msg-prop-1');

        // Verify fetch was called with the bridge /send endpoint
        expect(mockFetch).toHaveBeenCalledWith(
            'http://127.0.0.1:4000/send',
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('Ana Costa'),
            }),
        );

        // Verify the message body includes valor
        const fetchCallBody = JSON.parse(
            (mockFetch.mock.calls[0][1] as { body: string }).body,
        );
        expect(fetchCallBody.message).toContain('*Valor da Proposta:* R$ 2.000,00');
        expect(fetchCallBody.message).toContain('Ola *Ana Costa*!');
    });
});
