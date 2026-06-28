import { ApiError } from './api-error';

/** Mirrors the backend response envelope (specs/07-api-spec.md §1.2). */
interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string; details?: Record<string, string[]> } | null;
  meta: { total: number; page: number; limit: number } | null;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
const API_PREFIX = '/api/v1';

type Body = Record<string, unknown> | unknown[] | undefined;

async function request<T>(method: string, path: string, body?: Body): Promise<T> {
  const url = `${BASE_URL}${API_PREFIX}${path.startsWith('/') ? path : `/${path}`}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      // Session cookie auth — send credentials cross-origin.
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Tidak dapat terhubung ke server.', 0, 'NETWORK_ERROR');
  }

  const envelope = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || !envelope || envelope.success === false) {
    const err = envelope?.error;
    throw new ApiError(
      err?.message ?? 'Terjadi kesalahan.',
      response.status,
      err?.code ?? 'ERROR',
      err?.details,
    );
  }

  // Unwrap: callers receive T, not the envelope.
  return envelope.data as T;
}

export const apiClient = {
  get: <T>(path: string): Promise<T> => request<T>('GET', path),
  post: <T>(path: string, body?: Body): Promise<T> => request<T>('POST', path, body),
  put: <T>(path: string, body?: Body): Promise<T> => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: Body): Promise<T> => request<T>('PATCH', path, body),
  delete: <T>(path: string): Promise<T> => request<T>('DELETE', path),
};
