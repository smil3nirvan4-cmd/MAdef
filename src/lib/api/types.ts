export interface ApiMeta {
    requestId: string;
    durationMs?: number;
    timestamp: string;
}

export interface ApiSuccess<T> {
    success: true;
    data: T;
    meta: ApiMeta;
}

export interface ApiError {
    success: false;
    error: {
        code: string;
        message: string;
        details?: unknown;
        field?: string;
    };
    meta: ApiMeta;
}

export interface ApiPagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export interface ApiPaginatedSuccess<T> extends ApiSuccess<T[]> {
    pagination: ApiPagination;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
export type ApiPaginatedResponse<T> = ApiPaginatedSuccess<T> | ApiError;
