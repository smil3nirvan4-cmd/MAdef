import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const type = searchParams.get('type');
        const action = searchParams.get('action');
        const phone = searchParams.get('phone');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const where: any = {};

        if (type) where.type = type;
        if (action) where.action = { contains: action };
        if (phone) where.metadata = { contains: phone.replace(/\D/g, '') };
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const [logs, total] = await Promise.all([
            prisma.systemLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.systemLog.count({ where }),
        ]);

        return NextResponse.json({
            logs,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error('Erro ao buscar logs:', error);
        return NextResponse.json(
            { error: 'Falha ao buscar logs' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { olderThanDays } = await request.json();

        if (!olderThanDays || olderThanDays < 1) {
            return NextResponse.json(
                { error: 'olderThanDays deve ser >= 1' },
                { status: 400 }
            );
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        const result = await prisma.systemLog.deleteMany({
            where: { createdAt: { lt: cutoffDate } },
        });

        return NextResponse.json({
            deleted: result.count,
            message: `${result.count} logs removidos (anteriores a ${cutoffDate.toISOString()})`,
        });
    } catch (error) {
        console.error('Erro ao limpar logs:', error);
        return NextResponse.json(
            { error: 'Falha ao limpar logs' },
            { status: 500 }
        );
    }
}
