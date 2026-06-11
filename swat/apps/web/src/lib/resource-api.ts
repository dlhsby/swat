import { apiClient } from './api-client';

/** Per-request page size when fetching the full list (backend caps `limit` at 1000). */
const PAGE_SIZE = 1000;
/** Safety bound so a miscount can't loop forever (1000 × 50 = 50k rows). */
const MAX_PAGES = 50;

/** Generic CRUD client over a base path (e.g. `/vehicles`). */
export interface ResourceApi<TDto> {
  /**
   * List rows. The DataTable and select pickers page/search client-side, so this
   * transparently fetches *all* pages (1000/req) and concatenates them — master
   * data now runs to thousands of legacy rows, well past a single page.
   * `query` may carry filters (e.g. `?status=ACTIVE`); page/limit are merged in.
   */
  list: (query?: string) => Promise<TDto[]>;
  get: (id: string | number) => Promise<TDto>;
  create: (body: Record<string, unknown>) => Promise<TDto>;
  update: (id: string | number, body: Record<string, unknown>) => Promise<TDto>;
  remove: (id: string | number) => Promise<{ message: string }>;
}

/** Merge caller filters with the page/limit for one request. */
function pagedQuery(query: string | undefined, page: number): string {
  const params = new URLSearchParams(query?.replace(/^\?/, '') ?? '');
  params.set('page', String(page));
  params.set('limit', String(PAGE_SIZE));
  return `?${params.toString()}`;
}

export function makeResourceApi<TDto>(base: string): ResourceApi<TDto> {
  return {
    list: async (query) => {
      const all: TDto[] = [];
      for (let page = 1; page <= MAX_PAGES; page += 1) {
        const batch = await apiClient.get<TDto[]>(`${base}${pagedQuery(query, page)}`);
        all.push(...batch);
        if (batch.length < PAGE_SIZE) break;
      }
      return all;
    },
    get: (id) => apiClient.get<TDto>(`${base}/${id}`),
    create: (body) => apiClient.post<TDto>(base, body),
    update: (id, body) => apiClient.patch<TDto>(`${base}/${id}`, body),
    remove: (id) => apiClient.delete<{ message: string }>(`${base}/${id}`),
  };
}
