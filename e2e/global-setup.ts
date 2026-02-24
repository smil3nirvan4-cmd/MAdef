import { request } from '@playwright/test';
import path from 'path';

const STORAGE_STATE_PATH = path.join(__dirname, '.auth-state.json');

async function globalSetup() {
    const email = process.env.ADMIN_EMAIL || 'admin@madef.test';
    const password = process.env.ADMIN_PASSWORD || 'test-password-123';
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';

    const context = await request.newContext({ baseURL });

    // 1. Get CSRF token
    const csrfResponse = await context.get('/api/auth/csrf');
    const { csrfToken } = await csrfResponse.json();

    // 2. Login via credentials callback
    await context.post('/api/auth/callback/credentials', {
        form: {
            csrfToken,
            email,
            password,
        },
    });

    // 3. Save storage state (cookies) for all tests
    await context.storageState({ path: STORAGE_STATE_PATH });
    await context.dispose();
}

export default globalSetup;
export { STORAGE_STATE_PATH };
