import fs from 'fs';
import path from 'path';

export function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const envConfig = fs.readFileSync(envPath, 'utf-8');
            envConfig.split('\n').forEach(line => {
                const [key, value] = line.split('=');
                if (key && value && !process.env[key.trim()]) {
                    process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
                }
            });
            console.log('✅ .env loaded manually');
        } else {
            console.log('⚠️ .env not found');
        }
    } catch (_e) {
        console.error('Error loading .env:', _e);
    }
}
