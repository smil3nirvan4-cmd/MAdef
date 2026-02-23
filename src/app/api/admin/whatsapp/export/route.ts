import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { parseBody } from '@/lib/api/parse-body';

const importSettingsSchema = z.object({
    'automation-settings': z.unknown().optional(),
    'templates': z.unknown().optional(),
    'quick-replies': z.unknown().optional(),
    'autoreplies': z.unknown().optional(),
    'webhooks': z.unknown().optional(),
    'labels': z.unknown().optional(),
    'blacklist': z.unknown().optional(),
}).passthrough();

// Export all WhatsApp settings
async function handleGet() {
    const guard = await guardCapability('VIEW_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const files = [
        '.wa-automation-settings.json',
        '.wa-templates.json',
        '.wa-quick-replies.json',
        '.wa-autoreplies.json',
        '.wa-webhooks.json',
        '.wa-labels.json',
        '.wa-blacklist.json',
    ];

    const exportData: any = { exportedAt: new Date().toISOString(), version: '1.0' };

    for (const file of files) {
        const filePath = path.join(process.cwd(), file);
        try {
            if (fs.existsSync(filePath)) {
                const key = file.replace('.wa-', '').replace('.json', '');
                exportData[key] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            }
        } catch (_e) { }
    }

    return NextResponse.json(exportData);
}

// Import settings
async function handlePost(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    const { data, error } = await parseBody(request, importSettingsSchema);
    if (error) return error;

    const mappings: Record<string, string> = {
        'automation-settings': '.wa-automation-settings.json',
        'templates': '.wa-templates.json',
        'quick-replies': '.wa-quick-replies.json',
        'autoreplies': '.wa-autoreplies.json',
        'webhooks': '.wa-webhooks.json',
        'labels': '.wa-labels.json',
        'blacklist': '.wa-blacklist.json',
    };

    let imported = 0;
    for (const [key, filename] of Object.entries(mappings)) {
        if (data[key]) {
            const filePath = path.join(process.cwd(), filename);
            fs.writeFileSync(filePath, JSON.stringify(data[key], null, 2));
            imported++;
        }
    }

    return NextResponse.json({ success: true, imported });
}

export const GET = withRateLimit(withErrorBoundary(handleGet), { max: 30, windowMs: 60_000 });
export const POST = withRateLimit(withErrorBoundary(handlePost), { max: 10, windowMs: 60_000 });
