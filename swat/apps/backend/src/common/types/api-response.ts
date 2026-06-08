/**
 * Canonical API response envelope shared by every endpoint.
 *
 * Successful responses carry `data` (and optional pagination `meta`);
 * failures carry a structured `error`. The shape mirrors
 * `specs/07-api-spec.md` §1.2 and the frontend `ApiResponse<T>` contract so
 * the web client can unwrap responses uniformly.
 */

export interface ApiErrorPayload {
  /** Machine-readable error code, e.g. `VALIDATION_ERROR`, `NOT_FOUND`. */
  readonly code: string;
  /** Human-readable message (safe for clients; never leaks internals). */
  readonly message: string;
  /** Optional field-level validation details. */
  readonly details?: Readonly<Record<string, string[]>>;
}

export interface PaginationMeta {
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}

export interface ApiResponse<T = unknown> {
  readonly success: boolean;
  readonly data: T | null;
  readonly error: ApiErrorPayload | null;
  readonly meta: PaginationMeta | null;
}

export const successResponse = <T>(
  data: T,
  meta: PaginationMeta | null = null,
): ApiResponse<T> => ({
  success: true,
  data,
  error: null,
  meta,
});

export const errorResponse = (error: ApiErrorPayload): ApiResponse<never> => ({
  success: false,
  data: null,
  error,
  meta: null,
});
