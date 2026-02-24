import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { guardCapability } from '@/lib/auth/capability-guard';

async function handleGet(_request: NextRequest) {
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

        const formattedData = Object.entries(data).map(([key, value]) => {
            try {
                return typeof value === 'string' ? JSON.parse(value) : value;
            } catch {
                return null;
            }
        }).filter(item => item !== null);

        formattedData.sort((a, b) => new Date(b.lastInteraction).getTime() - new Date(a.lastInteraction).getTime());

        return NextResponse.json({ success: true, count: formattedData.length, data: formattedData });
    } catch (error) {
        console.error('Erro ao ler dados do WhatsApp:', error);
        return NextResponse.json({ success: false, error: 'Erro ao carregar dados' }, { status: 500 });
    }
}

export const GET = withErrorBoundary(handleGet);
