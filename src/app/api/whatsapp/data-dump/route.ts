import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import logger from '@/lib/observability/logger';
import { guardCapability } from '@/lib/auth/capability-guard';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';

async function handleGet(request: NextRequest) {
    const guard = await guardCapability('MANAGE_WHATSAPP');
    if (guard instanceof NextResponse) return guard;

    try {
        const filePath = path.resolve(process.cwd(), '.wa-state.json');

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({
                success: true,
                data: [],
                message: 'Nenhum dado salvo ainda.'
            });
        }

        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(fileContent);

        // Converter objeto plana em array de estados estruturada
        const formattedData = Object.entries(data).map(([key, value]) => {
            try {
                // value é uma string JSON stringified (porque é assim que está no Map)
                return typeof value === 'string' ? JSON.parse(value) : value;
            } catch {
                return null;
            }
        }).filter(item => item !== null);

        // Ordenar por última interação (mais recente primeiro)
        formattedData.sort((a, b) => new Date(b.lastInteraction).getTime() - new Date(a.lastInteraction).getTime());

        return NextResponse.json({ success: true, count: formattedData.length, data: formattedData });
    } catch (error) {
        await logger.error('whatsapp_data_dump_error', 'Erro ao ler dados do WhatsApp', error instanceof Error ? error : undefined);
        return NextResponse.json({ success: false, error: 'Erro ao carregar dados' }, { status: 500 });
    }
}

export const GET = withRateLimit(withErrorBoundary(handleGet), { max: 5, windowMs: 60_000 });
