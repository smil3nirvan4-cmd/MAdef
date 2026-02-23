import { NextResponse } from 'next/server';
import { generateCsrfToken, setCsrfCookie } from '@/lib/csrf';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';

async function handleGet() {
    const token = generateCsrfToken();
    const response = NextResponse.json({ csrfToken: token });
    setCsrfCookie(response, token);
    return response;
}

export const GET = withRateLimit(withErrorBoundary(handleGet), { max: 30, windowMs: 60_000 });
