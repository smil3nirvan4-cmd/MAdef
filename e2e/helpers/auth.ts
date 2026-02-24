import { APIRequestContext } from '@playwright/test';

/**
 * Authenticate via NextAuth Credentials provider and return
 * an APIRequestContext that carries the session cookie.
 */
export async function loginAsAdmin(request: APIRequestContext): Promise<void> {
    const email = process.env.ADMIN_EMAIL || 'admin@madef.test';
    const password = process.env.ADMIN_PASSWORD || 'test-password-123';

    // 1. Get CSRF token
    const csrfResponse = await request.get('/api/auth/csrf');
    const { csrfToken } = await csrfResponse.json();

    // 2. Login via credentials callback
    await request.post('/api/auth/callback/credentials', {
        form: {
            csrfToken,
            email,
            password,
        },
    });
}
