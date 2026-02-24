import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardCapability } from '@/lib/auth/capability-guard';
import { E, fail, paginated, ok } from '@/lib/api/response';
import { parsePagination, parseSort } from '@/lib/api/query-params';
import { withRequestContext } from '@/lib/api/with-request-context';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';

const SORTABLE_FIELDS = ['createdAt', 'type', 'action'] as const;

const getHandler = async (request: NextRequest) => {
    try {
        const guard = await guardCapability('VIEW_LOGS');
        if (guard instanceof NextResponse) return guard;

        const url = new URL(request.url);
        const { page, pageSize } = parsePagination(url);
        const { field, direction } = parseSort(url, [...SORTABLE_FIELDS], 'createdAt', 'desc');
        const searchParams = url.searchParams;

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
                orderBy: [{ [field]: direction }, { createdAt: 'desc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.systemLog.count({ where }),
        ]);

        return paginated(logs, { page, pageSize, total }, 200, {
            filters: { type, action, phone, startDate, endDate },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Falha ao buscar logs';
        return fail(E.DATABASE_ERROR, message, { status: 500 });
    }
};

const deleteHandler = async (request: NextRequest) => {
    try {
        const guard = await guardCapability('VIEW_LOGS');
        if (guard instanceof NextResponse) return guard;

        const { olderThanDays } = await request.json();
        if (!olderThanDays || olderThanDays < 1) {
            return fail(E.VALIDATION_ERROR, 'olderThanDays deve ser >= 1', { status: 400, field: 'olderThanDays' });
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        const result = await prisma.systemLog.deleteMany({
            where: { createdAt: { lt: cutoffDate } },
        });

        return ok({
            deleted: result.count,
            message: `${result.count} logs removidos (anteriores a ${cutoffDate.toISOString()})`,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Falha ao limpar logs';
        return fail(E.DATABASE_ERROR, message, { status: 500 });
    }
};

export const GET = withErrorBoundary(withRequestContext(getHandler));
export const DELETE = withErrorBoundary(withRequestContext(deleteHandler));
