import { NextRequest, NextResponse } from 'next/server';
import { searchPaciente } from '@/lib/database';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json([]);
    }

    try {
        const results = await searchPaciente(query);
        return NextResponse.json(results);
    } catch (error) {
        console.error('Erro na busca de pacientes:', error);
        return NextResponse.json({ error: 'Erro ao buscar pacientes' }, { status: 500 });
    }
}
