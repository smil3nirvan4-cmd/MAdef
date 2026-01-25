import { NextResponse } from 'next/server';
import { DB } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const cuidadores = await DB.cuidador.findAllPending();
        return NextResponse.json(cuidadores);
    } catch (error) {
        console.error('Erro ao buscar candidatos:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar candidatos' },
            { status: 500 }
        );
    }
}
