import { NextResponse } from 'next/server';
import { buildAdminCapabilities } from '@/lib/admin/capabilities';

export async function GET() {
    try {
        const capabilities = await buildAdminCapabilities();
        return NextResponse.json({ success: true, ...capabilities });
    } catch (error) {
        console.error('[API] capabilities GET erro:', error);
        return NextResponse.json({ success: false, error: 'Erro ao carregar capabilities' }, { status: 500 });
    }
}

