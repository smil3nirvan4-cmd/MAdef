import { afterEach, describe, expect, it } from 'vitest';
import { assertPublicUrl, buildAppUrl, getAppUrl } from './public-url';

const ORIGINAL_ENV = {
    NODE_ENV: process.env.NODE_ENV,
    APP_URL: process.env.APP_URL,
    NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL,
};

function setNodeEnv(value: string | undefined) {
    Object.defineProperty(process.env, 'NODE_ENV', {
        configurable: true,
        enumerable: true,
        value,
        writable: true,
    });
}

function resetEnv() {
    setNodeEnv(ORIGINAL_ENV.NODE_ENV);
    process.env.APP_URL = ORIGINAL_ENV.APP_URL;
    process.env.NEXT_PUBLIC_URL = ORIGINAL_ENV.NEXT_PUBLIC_URL;
}

afterEach(() => {
    resetEnv();
});

describe('public-url utilities', () => {
    it('uses localhost fallback in development when APP_URL is missing', () => {
        setNodeEnv('development');
        delete process.env.APP_URL;
        delete process.env.NEXT_PUBLIC_URL;

        expect(getAppUrl()).toBe('http://localhost:3000');
    });

    it('fails in production when APP_URL is missing', () => {
        setNodeEnv('production');
        delete process.env.APP_URL;
        delete process.env.NEXT_PUBLIC_URL;

        expect(() => getAppUrl()).toThrow(/APP_URL/);
    });

    it('fails in production when APP_URL points to localhost', () => {
        setNodeEnv('production');
        process.env.APP_URL = 'https://localhost:3000';

        expect(() => getAppUrl()).toThrow(/host local\/privado/);
    });

    it('fails in production for private IP', () => {
        setNodeEnv('production');
        expect(() => assertPublicUrl('https://10.0.0.5/path', 'link')).toThrow(/host local\/privado/);
    });

    it('fails in production for non-https URL', () => {
        setNodeEnv('production');
        expect(() => assertPublicUrl('http://example.com/path', 'link')).toThrow(/HTTPS/);
    });

    it('accepts public https URL in production', () => {
        setNodeEnv('production');
        const parsed = assertPublicUrl('https://example.com/abc', 'link');
        expect(parsed.hostname).toBe('example.com');
    });

    it('builds app URL with path and query', () => {
        setNodeEnv('production');
        process.env.APP_URL = 'https://portal.maosamigas.com.br/';
        const url = buildAppUrl('/legal/contrato/env_123?token=abc');
        expect(url).toBe('https://portal.maosamigas.com.br/legal/contrato/env_123?token=abc');
    });
});
