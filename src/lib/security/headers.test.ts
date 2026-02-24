import { describe, expect, it } from 'vitest';
import { SECURITY_HEADERS, applySecurityHeaders } from './headers';

describe('SECURITY_HEADERS', () => {
    it('contains all 6 expected security headers', () => {
        const expectedHeaders = [
            'X-Content-Type-Options',
            'X-Frame-Options',
            'X-XSS-Protection',
            'Referrer-Policy',
            'Permissions-Policy',
            'Strict-Transport-Security',
        ];

        expect(Object.keys(SECURITY_HEADERS)).toHaveLength(6);
        for (const header of expectedHeaders) {
            expect(SECURITY_HEADERS).toHaveProperty(header);
        }
    });

    it('has correct header values', () => {
        expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
        expect(SECURITY_HEADERS['X-Frame-Options']).toBe('DENY');
        expect(SECURITY_HEADERS['X-XSS-Protection']).toBe('1; mode=block');
        expect(SECURITY_HEADERS['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
        expect(SECURITY_HEADERS['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=()');
        expect(SECURITY_HEADERS['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains');
    });
});

describe('applySecurityHeaders', () => {
    it('sets all security headers on a mock response object', () => {
        const headersMap = new Map<string, string>();
        const mockResponse = {
            headers: {
                set(name: string, value: string) {
                    headersMap.set(name, value);
                },
            },
        };

        applySecurityHeaders(mockResponse);

        expect(headersMap.size).toBe(6);
        for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
            expect(headersMap.get(key)).toBe(value);
        }
    });
});
