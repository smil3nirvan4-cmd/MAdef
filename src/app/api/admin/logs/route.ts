import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { systemLogRepository } from '@/lib/repositories';
import { guardCapability } from '@/lib/auth/capability-guard';
import { paginated, ok } from '@/lib/api/response';
import { parsePagination, parseSort } from '@/lib/api/query-params';
import { withRequestContext } from '@/lib/api/with-request-context';
import { withErrorBoundary } from '@/lib/api/with-error-boundary';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { parseBody } from '@/lib/api/parse-body';

const SORTABLE_FIELDS = ['createdAt', 'type', 'action'] as const;

const getHandler = async (request: NextRequest) => {
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

    const { data: logs, total } = await systemLogRepository.findAll({
        page,
        pageSize,
        type: type || undefined,
        action: action || undefined,
        search: phone ? phone.replace(/\D/g, '') : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortField: field,
        sortDirection: direction as 'asc' | 'desc',
    });

    return paginated(logs, { page, pageSize, total }, 200, {
        filters: { type, action, phone, startDate, endDate },
    });
};

const deleteHandler = async (request: NextRequest) => {
    const guard = await guardCapability('VIEW_LOGS');
    if (guard instanceof NextResponse) return guard;

    const deleteLogsSchema = z.object({
        olderThanDays: z.number().int().min(1),
    });
    const { data: body, error: bodyError } = await parseBody(request, deleteLogsSchema);
    if (bodyError) return bodyError;
    const { olderThanDays } = body;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await systemLogRepository.deleteOlderThan(cutoffDate);

    return ok({
        deleted: result.count,
        message: `${result.count} logs removidos (anteriores a ${cutoffDate.toISOString()})`,
    });
};

export const GET = withRateLimit(withErrorBoundary(withRequestContext(getHandler)), { max: 30, windowMs: 60_000 });
export const DELETE = withRateLimit(withErrorBoundary(withRequestContext(deleteHandler)), { max: 5, windowMs: 60_000 });
