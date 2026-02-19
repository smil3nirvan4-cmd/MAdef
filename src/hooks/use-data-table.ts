'use client';

import { useCallback, useMemo, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface UseDataTableOptions {
    defaultPageSize?: number;
    defaultSort?: { field: string; direction: 'asc' | 'desc' };
    defaultFilters?: Record<string, string>;
    syncWithUrl?: boolean;
}

interface UseDataTableReturn {
    page: number;
    pageSize: number;
    sort: { field: string; direction: 'asc' | 'desc' };
    filters: Record<string, string>;
    setPage: (page: number) => void;
    setSort: (field: string, direction: 'asc' | 'desc') => void;
    setFilter: (key: string, value: string) => void;
    clearFilter: (key: string) => void;
    clearAllFilters: () => void;
    toQueryString: () => string;
}

function parseFilterString(raw: string | null): Record<string, string> {
    if (!raw) return {};

    const out: Record<string, string> = {};
    for (const part of raw.split(',')) {
        const [key, ...rest] = part.split(':');
        const normalizedKey = String(key || '').trim();
        const value = rest.join(':').trim();
        if (!normalizedKey || !value) continue;
        out[normalizedKey] = value;
    }
    return out;
}

function serializeFilters(filters: Record<string, string>): string {
    return Object.entries(filters)
        .filter(([, value]) => String(value || '').trim())
        .map(([key, value]) => `${key}:${value}`)
        .join(',');
}

function clampInt(value: number, min: number, fallback: number): number {
    if (!Number.isFinite(value)) return fallback;
    return Math.max(min, Math.floor(value));
}

export function useDataTable(options: UseDataTableOptions = {}): UseDataTableReturn {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const syncWithUrl = options.syncWithUrl ?? true;
    const defaultSort = options.defaultSort || { field: 'createdAt', direction: 'desc' as const };
    const defaultPageSize = options.defaultPageSize || 20;
    const defaultFilters = options.defaultFilters || {};

    const page = clampInt(Number(searchParams.get('page') || '1'), 1, 1);
    const pageSize = clampInt(Number(searchParams.get('pageSize') || String(defaultPageSize)), 1, defaultPageSize);

    const sort = useMemo(() => {
        const rawSort = searchParams.get('sort');
        if (!rawSort) return defaultSort;
        const [field, dir] = rawSort.split(':');
        return {
            field: field || defaultSort.field,
            direction: dir === 'asc' ? 'asc' : 'desc',
        } as { field: string; direction: 'asc' | 'desc' };
    }, [searchParams, defaultSort]);

    const filters = useMemo(
        () => ({ ...defaultFilters, ...parseFilterString(searchParams.get('filter')) }),
        [defaultFilters, searchParams]
    );

    const commitParams = useCallback((params: URLSearchParams) => {
        const next = params.toString();
        const target = next ? `${pathname}?${next}` : pathname;
        router.replace(target);
    }, [pathname, router]);

    const mutateParams = useCallback((mutator: (params: URLSearchParams) => void) => {
        const params = new URLSearchParams(searchParams.toString());
        mutator(params);
        return params;
    }, [searchParams]);

    const setPage = useCallback((nextPage: number) => {
        if (!syncWithUrl) return;
        const normalizedPage = clampInt(nextPage, 1, 1);
        const params = mutateParams((next) => {
            next.set('page', String(normalizedPage));
            next.set('pageSize', String(pageSize));
            next.set('sort', `${sort.field}:${sort.direction}`);
            const serialized = serializeFilters(filters);
            if (serialized) next.set('filter', serialized);
            else next.delete('filter');
        });
        commitParams(params);
    }, [syncWithUrl, mutateParams, pageSize, sort.field, sort.direction, filters, commitParams]);

    const setSort = useCallback((field: string, direction: 'asc' | 'desc') => {
        if (!syncWithUrl) return;
        const params = mutateParams((next) => {
            next.set('page', '1');
            next.set('pageSize', String(pageSize));
            next.set('sort', `${field}:${direction}`);
            const serialized = serializeFilters(filters);
            if (serialized) next.set('filter', serialized);
            else next.delete('filter');
        });
        commitParams(params);
    }, [syncWithUrl, mutateParams, pageSize, filters, commitParams]);

    const scheduleFilterCommit = useCallback((nextFilters: Record<string, string>) => {
        if (!syncWithUrl) return;
        const params = mutateParams((next) => {
            next.set('page', '1');
            next.set('pageSize', String(pageSize));
            next.set('sort', `${sort.field}:${sort.direction}`);
            const serialized = serializeFilters(nextFilters);
            if (serialized) next.set('filter', serialized);
            else next.delete('filter');
        });

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            commitParams(params);
        }, 300);
    }, [syncWithUrl, mutateParams, pageSize, sort.field, sort.direction, commitParams]);

    const setFilter = useCallback((key: string, value: string) => {
        const nextFilters = { ...filters };
        if (value.trim()) nextFilters[key] = value;
        else delete nextFilters[key];
        scheduleFilterCommit(nextFilters);
    }, [filters, scheduleFilterCommit]);

    const clearFilter = useCallback((key: string) => {
        const nextFilters = { ...filters };
        delete nextFilters[key];
        scheduleFilterCommit(nextFilters);
    }, [filters, scheduleFilterCommit]);

    const clearAllFilters = useCallback(() => {
        scheduleFilterCommit({});
    }, [scheduleFilterCommit]);

    const toQueryString = useCallback(() => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('pageSize', String(pageSize));
        params.set('sort', `${sort.field}:${sort.direction}`);
        const serialized = serializeFilters(filters);
        if (serialized) params.set('filter', serialized);
        return params.toString();
    }, [page, pageSize, sort.field, sort.direction, filters]);

    return {
        page,
        pageSize,
        sort,
        filters,
        setPage,
        setSort,
        setFilter,
        clearFilter,
        clearAllFilters,
        toQueryString,
    };
}

