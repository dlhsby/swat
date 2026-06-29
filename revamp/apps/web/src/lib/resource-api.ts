import { apiClient } from './api-client';

/** Per-request page size when fetching the full list (backend caps `limit` at 1000). */
const PAGE_SIZE = 1000;
/** Safety bound so a miscount can't loop forever (1000 × 50 = 50k rows). */
const MAX_PAGES = 50;

/** One page of rows plus the server's total, for server-side pagination. */
export interface ResourcePage<TDto> {
  rows: TDto[];
  total: number;
  page: number;
  limit: number;
}

/** Generic CRUD client over a base path (e.g. `/vehicles`). */
export interface ResourceApi<TDto> {
  /**
   * Fetch *all* rows (every page, concatenated) for client-side tables and select
   * pickers. Page 1 is fetched first to learn the total, then the remaining pages
   * run concurrently. Prefer {@link ResourceApi.page} for large tables — this is
   * for small master lists. `query` may carry filters (e.g. `?status=ACTIVE`).
   */
  list: (query?: string) => Promise<TDto[]>;
  /**
   * Fetch a SINGLE page, preserving the server total — for true server-side
   * pagination. `query` carries page/limit/search/filters; defaults are the
   * backend's (page 1, limit 20) when omitted.
   */
  page: (query?: string) => Promise<ResourcePage<TDto>>;
  get: (id: string | number) => Promise<TDto>;
  create: (body: Record<string, unknown>) => Promise<TDto>;
  update: (id: string | number, body: Record<string, unknown>) => Promise<TDto>;
  remove: (id: string | number) => Promise<{ message: string }>;
}

/** Merge caller filters with an explicit page/limit for one request. */
function pagedQuery(query: string | undefined, page: number, limit: number): string {
  const params = new URLSearchParams(query?.replace(/^\?/, '') ?? '');
  params.set('page', String(page));
  params.set('limit', String(limit));
  return `?${params.toString()}`;
}

export function makeResourceApi<TDto>(base: string): ResourceApi<TDto> {
  return {
    list: async (query) => {
      // Fetch page 1 to learn the total, then fan the rest out concurrently.
      const first = await apiClient.getPage<TDto>(`${base}${pagedQuery(query, 1, PAGE_SIZE)}`);
      if (first.meta.total > 0) {
        const totalPages = Math.min(MAX_PAGES, Math.ceil(first.meta.total / PAGE_SIZE));
        if (totalPages <= 1) return first.data;
        const rest = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) =>
            apiClient.getPage<TDto>(`${base}${pagedQuery(query, i + 2, PAGE_SIZE)}`),
          ),
        );
        return rest.reduce<TDto[]>((acc, p) => acc.concat(p.data), first.data.slice());
      }
      // No usable total (endpoint omitted meta): fall back to sequential paging
      // until a short page, so a full first page can't silently truncate.
      if (first.data.length < PAGE_SIZE) return first.data;
      const all = first.data.slice();
      for (let page = 2; page <= MAX_PAGES; page += 1) {
        const batch = await apiClient.getPage<TDto>(`${base}${pagedQuery(query, page, PAGE_SIZE)}`);
        all.push(...batch.data);
        if (batch.data.length < PAGE_SIZE) break;
      }
      return all;
    },
    page: async (query) => {
      const result = await apiClient.getPage<TDto>(`${base}${query ?? ''}`);
      return {
        rows: result.data,
        total: result.meta.total,
        page: result.meta.page,
        limit: result.meta.limit,
      };
    },
    get: (id) => apiClient.get<TDto>(`${base}/${id}`),
    create: (body) => apiClient.post<TDto>(base, body),
    update: (id, body) => apiClient.patch<TDto>(`${base}/${id}`, body),
    remove: (id) => apiClient.delete<{ message: string }>(`${base}/${id}`),
  };
}
