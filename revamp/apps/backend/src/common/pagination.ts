import { type PaginationMeta } from './types/api-response';

export interface PageParams {
  readonly page: number;
  readonly limit: number;
}

/** Prisma `skip`/`take` for a 1-indexed page. */
export function toSkipTake(params: PageParams): { skip: number; take: number } {
  return { skip: (params.page - 1) * params.limit, take: params.limit };
}

/**
 * Wrap a page of rows with its pagination metadata. The
 * {@link ApiResponseInterceptor} lifts `{ data, meta }` into the envelope's
 * top-level `meta`.
 */
export function paginated<T>(
  data: T[],
  total: number,
  params: PageParams,
): { data: T[]; meta: PaginationMeta } {
  return { data, meta: { total, page: params.page, limit: params.limit } };
}
