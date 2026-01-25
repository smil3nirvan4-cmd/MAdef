import { NextRequest, NextResponse } from 'next/server';
import { searchPaciente } from '@/lib/database';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json([]);
    }

    if (query.length < 3) {
        return NextResponse.json(
            { error: 'A busca deve ter no mínimo 3 caracteres' },
            { status: 400 }
        );
    }

    try {
        const results = await searchPaciente(query);
        return NextResponse.json(results);
    } catch (error) {
        console.error('Erro na busca de pacientes:', error);
        return NextResponse.json({ error: 'Erro ao buscar pacientes' }, { status: 500 });
    }
}
