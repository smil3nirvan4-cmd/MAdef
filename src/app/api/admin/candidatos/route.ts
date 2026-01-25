import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const cuidadores = await prisma.cuidador.findMany({
            where: {
                status: 'AGUARDANDO_RH'
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(cuidadores);
    } catch (error) {
        console.error('Erro ao buscar candidatos:', error);
        return NextResponse.json(
            { error: 'Erro ao buscar candidatos' },
            { status: 500 }
        );
    }
}
