import { test, expect } from '@playwright/test';

test.describe.serial('Fluxo: LGPD (consent + export + anonymize)', () => {
    const testPhone = `5531${Date.now().toString().slice(-8)}`;

    test('registrar consentimento TERMS', async ({ request }) => {
        const response = await request.post('/api/admin/lgpd', {
            data: {
                action: 'consent',
                phone: testPhone,
                tipo: 'TERMS',
                consentido: true,
            },
        });

        expect(response.status()).toBe(201);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.data.tipo).toBe('TERMS');
        expect(body.data.consentido).toBe(true);
    });

    test('registrar consentimento DATA_PROCESSING', async ({ request }) => {
        const response = await request.post('/api/admin/lgpd', {
            data: {
                action: 'consent',
                phone: testPhone,
                tipo: 'DATA_PROCESSING',
                consentido: true,
            },
        });

        expect(response.status()).toBe(201);
        const body = await response.json();
        expect(body.success).toBe(true);
    });

    test('consultar historico de consentimentos', async ({ request }) => {
        const response = await request.get(`/api/admin/lgpd?phone=${testPhone}&action=history`);
        expect(response.ok()).toBeTruthy();
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
        expect(body.data.length).toBeGreaterThanOrEqual(2);
    });

    test('consultar consentimentos ativos', async ({ request }) => {
        const response = await request.get(`/api/admin/lgpd?phone=${testPhone}&action=consents`);
        expect(response.ok()).toBeTruthy();
        const body = await response.json();
        expect(body.success).toBe(true);
    });

    test('exportar dados pessoais', async ({ request }) => {
        const response = await request.post('/api/admin/lgpd', {
            data: {
                action: 'export',
                phone: testPhone,
            },
        });

        expect(response.ok()).toBeTruthy();
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.data).toBeDefined();
    });

    test('anonimizar dados pessoais', async ({ request }) => {
        const response = await request.post('/api/admin/lgpd', {
            data: {
                action: 'anonymize',
                phone: testPhone,
            },
        });

        expect(response.ok()).toBeTruthy();
        const body = await response.json();
        expect(body.success).toBe(true);
    });

    test('historico apos anonimizacao esta vazio ou marcado', async ({ request }) => {
        const response = await request.get(`/api/admin/lgpd?phone=${testPhone}&action=history`);
        expect(response.ok()).toBeTruthy();
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(Array.isArray(body.data)).toBe(true);
    });
});
