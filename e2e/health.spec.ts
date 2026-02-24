import { test, expect } from '@playwright/test';

test.describe('Health & Accessibility', () => {
    test('health endpoint returns healthy status', async ({ request }) => {
        const response = await request.get('/api/health');
        expect(response.ok()).toBeTruthy();
        const body = await response.json();
        expect(body.status).toBeDefined();
        expect(['healthy', 'degraded']).toContain(body.status);
        expect(body.checks.database).toBeDefined();
    });

    test('API docs endpoint returns OpenAPI spec', async ({ request }) => {
        const response = await request.get('/api/docs');
        expect(response.ok()).toBeTruthy();
        const body = await response.json();
        expect(body.openapi).toBe('3.1.0');
        expect(body.info.title).toContain('MAdef');
        expect(Object.keys(body.paths).length).toBeGreaterThan(10);
    });

    test('unauthenticated request to admin route returns 401', async ({ request }) => {
        const response = await request.get('/api/admin/pacientes');
        expect(response.status()).toBe(401);
    });

    test('invalid route returns 404', async ({ request }) => {
        const response = await request.get('/api/rota-inexistente');
        expect(response.status()).toBe(404);
    });
});
