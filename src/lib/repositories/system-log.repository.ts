import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export interface SystemLogListParams {
    page?: number;
    pageSize?: number;
    type?: string;
    action?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
}

const SORTABLE_FIELDS = ['createdAt', 'type', 'action'] as const;

function buildWhere(params: SystemLogListParams): Prisma.SystemLogWhereInput {
    const where: Prisma.SystemLogWhereInput = {};
    if (params.type) where.type = params.type;
    if (params.action) where.action = { contains: params.action };
    if (params.search) where.metadata = { contains: params.search };
    if (params.startDate || params.endDate) {
        where.createdAt = {};
        if (params.startDate) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(params.startDate);
        if (params.endDate) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(params.endDate);
    }
    return where;
}

function buildOrderBy(field?: string, dir?: 'asc' | 'desc'): Prisma.SystemLogOrderByWithRelationInput[] {
    const direction = dir || 'desc';
    if (field && (SORTABLE_FIELDS as readonly string[]).includes(field)) {
        return [{ [field]: direction }, { createdAt: 'desc' }];
    }
    return [{ createdAt: 'desc' }];
}

export const systemLogRepository = {
    async findAll(params: SystemLogListParams = {}) {
        const page = params.page || 1;
        const pageSize = params.pageSize || 50;
        const where = buildWhere(params);

        const [data, total] = await Promise.all([
            prisma.systemLog.findMany({
                where,
                orderBy: buildOrderBy(params.sortField, params.sortDirection),
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            prisma.systemLog.count({ where }),
        ]);

        return { data, total, page, pageSize };
    },

    async count(where?: Prisma.SystemLogWhereInput) {
        return prisma.systemLog.count({ where });
    },

    async deleteOlderThan(date: Date) {
        return prisma.systemLog.deleteMany({ where: { createdAt: { lt: date } } });
    },
};
