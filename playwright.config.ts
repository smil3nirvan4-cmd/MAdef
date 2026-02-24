import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    timeout: 30_000,
    retries: 1,
    use: {
        baseURL: 'http://localhost:3000',
    },
    projects: [
        {
            name: 'api',
            // API-only tests — no browser needed
            use: {
                extraHTTPHeaders: {
                    'Accept': 'application/json',
                },
            },
        },
    ],
    webServer: {
        command: 'npm run dev:web',
        port: 3000,
        timeout: 120_000,
        reuseExistingServer: true,
    },
});
