/**
 * Mirrors the backend's PaginationMeta struct from internal/domain/pagination.go
 */
export interface PaginationMeta {
    current_page: number;
    page_size: number;
    total_count: number;
    total_pages: number;
}

/**
 * Mirrors the backend's PaginatedResponse struct.
 * The backend wraps paginated data in { data: T[], meta: PaginationMeta }.
 */
export interface PaginatedResponse<T> {
    data: T[];
    meta: PaginationMeta;
}

/**
 * Local pagination state for components.
 */
export interface PaginationState {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
}

export const DEFAULT_PAGE_SIZE = 50;

export function defaultPaginationState(): PaginationState {
    return {
        currentPage: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        totalCount: 0,
        totalPages: 0
    };
}
