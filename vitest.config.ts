import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['**/*.test.ts'],
        exclude: ['node_modules', '.next', 'whatsapp-bridge/**'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'text-summary'],
            include: ['src/lib/**/*.ts', 'src/app/api/**/*.ts'],
            exclude: ['**/*.test.ts', '**/*.d.ts'],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
