import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { guardCapability } from '@/lib/auth/capability-guard';

// Export all WhatsApp settings
async function handleGet(_request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    try {
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
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao exportar' }, { status: 500 });
    }
}

// Import settings
async function handlePost(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    try {
        const data = await request.json();

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
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao importar' }, { status: 500 });
    }
}

export const GET = withErrorBoundary(handleGet);
export const POST = withErrorBoundary(handlePost);
