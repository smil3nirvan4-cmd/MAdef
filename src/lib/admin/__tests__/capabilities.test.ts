import { beforeEach, describe, expect, it, vi } from 'vitest';

/* ------------------------------------------------------------------ */
/*  Hoisted mocks                                                     */
/* ------------------------------------------------------------------ */
const mocks = vi.hoisted(() => ({
    existsSync: vi.fn<(p: string) => boolean>().mockReturnValue(false),
    resolveBridgeConfig: vi.fn().mockReturnValue({
        bridgeUrl: 'http://127.0.0.1:4000',
        port: '4000',
        host: '127.0.0.1',
        portFile: '/tmp/.wa-bridge-port',
        recommendedCommand: 'npm run dev',
    }),
    fetch: vi.fn(),
}));

vi.mock('node:fs', () => ({
    existsSync: mocks.existsSync,
}));

vi.mock('@/lib/whatsapp/bridge-config', () => ({
    resolveBridgeConfig: mocks.resolveBridgeConfig,
}));

/* Replace global fetch */
vi.stubGlobal('fetch', mocks.fetch);

import {
    readWhatsAppHealth,
    buildAdminCapabilities,
    type AdminCapability,
    type CapabilitiesResponse,
} from '../capabilities';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Set up existsSync so that specific app paths "exist". */
function enablePaths(paths: string[]) {
    mocks.existsSync.mockImplementation((p: string) =>
        paths.some((allowed) => p.endsWith(allowed)),
    );
}

/** Create a mock Response object for fetch. */
function mockFetchResponse(body: object, ok = true, status = 200): Response {
    return {
        ok,
        status,
        json: vi.fn().mockResolvedValue(body),
    } as unknown as Response;
}

/* ------------------------------------------------------------------ */
/*  Tests: readWhatsAppHealth                                         */
/* ------------------------------------------------------------------ */
describe('readWhatsAppHealth', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns connected status when bridge responds with ok and connected payload', async () => {
        mocks.fetch.mockResolvedValue(
            mockFetchResponse({ connected: true, status: 'CONNECTED', retryCount: 0, lastStatusCode: 200 }),
        );

        const result = await readWhatsAppHealth();

        expect(mocks.fetch).toHaveBeenCalledWith(
            'http://127.0.0.1:4000/status',
            expect.objectContaining({ signal: expect.any(AbortSignal) }),
        );
        expect(result).toEqual({
            bridgeRunning: true,
            connected: true,
            status: 'CONNECTED',
            retryCount: 0,
            lastStatusCode: 200,
            credentialsValid: true,
        });
    });

    it('returns disconnected status when bridge responds with connected=false', async () => {
        mocks.fetch.mockResolvedValue(
            mockFetchResponse({ connected: false, retryCount: 2, lastStatusCode: null }),
        );

        const result = await readWhatsAppHealth();

        expect(result).toEqual({
            bridgeRunning: true,
            connected: false,
            status: 'DISCONNECTED',
            retryCount: 2,
            lastStatusCode: null,
            credentialsValid: true,
        });
    });

    it('returns OFFLINE when fetch throws (network error)', async () => {
        mocks.fetch.mockRejectedValue(new Error('ECONNREFUSED'));

        const result = await readWhatsAppHealth();

        expect(result).toEqual({
            bridgeRunning: false,
            connected: false,
            status: 'OFFLINE',
            retryCount: 0,
            lastStatusCode: null,
            credentialsValid: false,
        });
    });

    it('returns http error status when response is not ok', async () => {
        mocks.fetch.mockResolvedValue(
            mockFetchResponse({}, false, 500),
        );

        const result = await readWhatsAppHealth();

        expect(result).toEqual({
            bridgeRunning: true,
            connected: false,
            status: 'http_500',
            retryCount: 0,
            lastStatusCode: null,
            credentialsValid: true,
        });
    });

    it('marks credentials invalid when response status is 401', async () => {
        mocks.fetch.mockResolvedValue(
            mockFetchResponse({}, false, 401),
        );

        const result = await readWhatsAppHealth();

        expect(result.credentialsValid).toBe(false);
        expect(result.status).toBe('http_401');
    });

    it('handles json parse failure on an ok response', async () => {
        const resp = {
            ok: true,
            status: 200,
            json: vi.fn().mockRejectedValue(new Error('invalid json')),
        } as unknown as Response;
        mocks.fetch.mockResolvedValue(resp);

        const result = await readWhatsAppHealth();

        // When json() fails, catch returns {}
        expect(result).toEqual({
            bridgeRunning: true,
            connected: false,
            status: 'DISCONNECTED',
            retryCount: 0,
            lastStatusCode: null,
            credentialsValid: true,
        });
    });

    it('marks credentials invalid when lastStatusCode is 401 in payload', async () => {
        mocks.fetch.mockResolvedValue(
            mockFetchResponse({ connected: true, status: 'CONNECTED', retryCount: 0, lastStatusCode: 401 }),
        );

        const result = await readWhatsAppHealth();

        expect(result.credentialsValid).toBe(false);
    });

    it('uses bridgeUrl from bridge config', async () => {
        mocks.resolveBridgeConfig.mockReturnValue({
            bridgeUrl: 'http://custom-host:9999',
            port: '9999',
            host: 'custom-host',
            portFile: '/tmp/.wa-bridge-port',
            recommendedCommand: 'npm run dev',
        });
        mocks.fetch.mockResolvedValue(
            mockFetchResponse({ connected: false }),
        );

        await readWhatsAppHealth();

        expect(mocks.fetch).toHaveBeenCalledWith(
            'http://custom-host:9999/status',
            expect.anything(),
        );
    });
});

/* ------------------------------------------------------------------ */
/*  Tests: buildAdminCapabilities                                     */
/* ------------------------------------------------------------------ */
describe('buildAdminCapabilities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default: fetch fails => whatsapp offline
        mocks.fetch.mockRejectedValue(new Error('offline'));
    });

    it('returns expected shape with generatedAt, role, modules, whatsappHealth', async () => {
        const result = await buildAdminCapabilities();

        expect(result).toHaveProperty('generatedAt');
        expect(result).toHaveProperty('role', 'LEITURA');
        expect(result).toHaveProperty('modules');
        expect(result).toHaveProperty('whatsappHealth');
        expect(Array.isArray(result.modules)).toBe(true);
        expect(result.modules.length).toBeGreaterThan(0);
    });

    it('defaults role to LEITURA when no options provided', async () => {
        const result = await buildAdminCapabilities();
        expect(result.role).toBe('LEITURA');
    });

    it('uses the role provided in options', async () => {
        const result = await buildAdminCapabilities({ role: 'ADMIN' });
        expect(result.role).toBe('ADMIN');
    });

    it('all modules are disabled when no filesystem paths exist', async () => {
        mocks.existsSync.mockReturnValue(false);

        const result = await buildAdminCapabilities({ role: 'ADMIN' });

        for (const mod of result.modules) {
            expect(mod.enabled).toBe(false);
        }
    });

    it('enables a core module when both page and api route files exist', async () => {
        // Enable 'dashboard' module: needs page.tsx or loading.tsx AND api route.ts
        enablePaths([
            'src/app/admin/dashboard/page.tsx',
            'src/app/api/admin/dashboard/stats/route.ts',
        ]);

        const result = await buildAdminCapabilities({ role: 'ADMIN' });
        const dashboard = result.modules.find((m) => m.key === 'dashboard');

        expect(dashboard).toBeDefined();
        expect(dashboard!.enabled).toBe(true);
    });

    it('disables a module when page exists but api route does not', async () => {
        // Only page, no api route
        enablePaths([
            'src/app/admin/dashboard/page.tsx',
        ]);

        const result = await buildAdminCapabilities({ role: 'ADMIN' });
        const dashboard = result.modules.find((m) => m.key === 'dashboard');

        expect(dashboard!.enabled).toBe(false);
    });

    it('enables whatsapp modules even without page.tsx because route starts with /admin/whatsapp/', async () => {
        // WhatsApp modules get routeEnabled=true even without a page because of
        // the `module.route.startsWith('/admin/whatsapp/')` condition.
        // They still need an api route.ts to be fully enabled.
        enablePaths([
            'src/app/api/admin/whatsapp/contacts/route.ts',
        ]);

        const result = await buildAdminCapabilities({ role: 'ADMIN' });
        const waContacts = result.modules.find((m) => m.key === 'whatsapp_contacts');

        expect(waContacts).toBeDefined();
        expect(waContacts!.enabled).toBe(true);
    });

    it('blocks "usuarios" module for OPERADOR role', async () => {
        // Enable all filesystem paths
        mocks.existsSync.mockReturnValue(true);

        const result = await buildAdminCapabilities({ role: 'OPERADOR' });
        const usuarios = result.modules.find((m) => m.key === 'usuarios');

        expect(usuarios!.enabled).toBe(false);
    });

    it('blocks "whatsapp_settings" module for OPERADOR role', async () => {
        mocks.existsSync.mockReturnValue(true);

        const result = await buildAdminCapabilities({ role: 'OPERADOR' });
        const waSettings = result.modules.find((m) => m.key === 'whatsapp_settings');

        expect(waSettings!.enabled).toBe(false);
    });

    it('blocks "usuarios" module for LEITURA role', async () => {
        mocks.existsSync.mockReturnValue(true);

        const result = await buildAdminCapabilities({ role: 'LEITURA' });
        const usuarios = result.modules.find((m) => m.key === 'usuarios');

        expect(usuarios!.enabled).toBe(false);
    });

    it('does NOT block "whatsapp_settings" for LEITURA role', async () => {
        mocks.existsSync.mockReturnValue(true);

        const result = await buildAdminCapabilities({ role: 'LEITURA' });
        const waSettings = result.modules.find((m) => m.key === 'whatsapp_settings');

        // LEITURA only blocks 'usuarios', not 'whatsapp_settings'
        expect(waSettings!.enabled).toBe(true);
    });

    it('ADMIN role does not have any role-based blocks', async () => {
        mocks.existsSync.mockReturnValue(true);

        const result = await buildAdminCapabilities({ role: 'ADMIN' });
        const usuarios = result.modules.find((m) => m.key === 'usuarios');
        const waSettings = result.modules.find((m) => m.key === 'whatsapp_settings');

        expect(usuarios!.enabled).toBe(true);
        expect(waSettings!.enabled).toBe(true);
    });

    it('modules contain expected categories', async () => {
        const result = await buildAdminCapabilities();
        const categories = new Set(result.modules.map((m) => m.category));

        expect(categories.has('core')).toBe(true);
        expect(categories.has('whatsapp')).toBe(true);
        expect(categories.has('operations')).toBe(true);
    });

    it('generatedAt is a valid ISO string', async () => {
        const result = await buildAdminCapabilities();
        const parsed = new Date(result.generatedAt);
        expect(parsed.toISOString()).toBe(result.generatedAt);
    });

    it('loading.tsx also enables the route', async () => {
        enablePaths([
            'src/app/admin/pacientes/loading.tsx',
            'src/app/api/admin/pacientes/route.ts',
        ]);

        const result = await buildAdminCapabilities({ role: 'ADMIN' });
        const pacientes = result.modules.find((m) => m.key === 'pacientes');

        expect(pacientes!.enabled).toBe(true);
    });

    it('includes whatsappHealth in the response', async () => {
        mocks.fetch.mockResolvedValue(
            mockFetchResponse({ connected: true, status: 'CONNECTED', retryCount: 0, lastStatusCode: 200 }),
        );

        const result = await buildAdminCapabilities();

        expect(result.whatsappHealth.bridgeRunning).toBe(true);
        expect(result.whatsappHealth.connected).toBe(true);
    });
});
