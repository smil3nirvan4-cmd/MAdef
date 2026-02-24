import { NextRequest, NextResponse } from 'next/server';
import { searchPaciente } from '@/lib/database';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { guardCapability } from '@/lib/auth/capability-guard';

async function handleGet(request: NextRequest) {
    const guard = await guardCapability('VIEW_PACIENTES');
    if (guard instanceof NextResponse) return guard;

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

export const GET = withErrorBoundary(handleGet);
