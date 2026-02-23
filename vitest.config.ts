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
            reporter: ['text', 'text-summary', 'lcov'],
            include: ['src/lib/**/*.ts', 'src/app/api/**/*.ts'],
            exclude: ['**/*.test.ts', '**/*.d.ts', 'src/__tests__/**'],
            thresholds: {
                statements: 60,
                branches: 50,
                functions: 55,
                lines: 60,
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
