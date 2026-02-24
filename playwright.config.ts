import { defineConfig } from '@playwright/test';
import path from 'path';

const authStatePath = path.join(__dirname, 'e2e', '.auth-state.json');

export default defineConfig({
    testDir: './e2e',
    timeout: 30_000,
    retries: 1,
    globalSetup: './e2e/global-setup.ts',
    use: {
        baseURL: 'http://localhost:3000',
        storageState: authStatePath,
    },
    projects: [
        {
            name: 'api',
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
