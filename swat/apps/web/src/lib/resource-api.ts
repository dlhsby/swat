import { apiClient } from './api-client';

/** Generic CRUD client over a base path (e.g. `/vehicles`). */
export interface ResourceApi<TDto> {
  /** List rows. Defaults to `?limit=100` (DataTable paginates client-side). */
  list: (query?: string) => Promise<TDto[]>;
  get: (id: string | number) => Promise<TDto>;
  create: (body: Record<string, unknown>) => Promise<TDto>;
  update: (id: string | number, body: Record<string, unknown>) => Promise<TDto>;
  remove: (id: string | number) => Promise<{ message: string }>;
}

export function makeResourceApi<TDto>(base: string): ResourceApi<TDto> {
  return {
    list: (query = '?limit=100') => apiClient.get<TDto[]>(`${base}${query}`),
    get: (id) => apiClient.get<TDto>(`${base}/${id}`),
    create: (body) => apiClient.post<TDto>(base, body),
    update: (id, body) => apiClient.patch<TDto>(`${base}/${id}`, body),
    remove: (id) => apiClient.delete<{ message: string }>(`${base}/${id}`),
  };
}
