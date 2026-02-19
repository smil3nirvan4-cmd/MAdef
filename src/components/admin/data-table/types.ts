import type { ReactNode } from 'react';
import type { ApiPagination } from '@/lib/api/types';

export interface ColumnDef<T> {
    key: string;
    header: string;
    accessor: (row: T) => ReactNode;
    sortable?: boolean;
    width?: string;
    hidden?: boolean;
}

export interface DataTableProps<T> {
    tableId?: string;
    columns: ColumnDef<T>[];
    data: T[];
    pagination?: ApiPagination;
    loading?: boolean;
    error?: string | null;
    emptyMessage?: string;
    onPageChange?: (page: number) => void;
    onSort?: (field: string, direction: 'asc' | 'desc') => void;
    onExportCSV?: () => void;
    caption?: string;
}
