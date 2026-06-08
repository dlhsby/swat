'use client';

import { useCallback, useState } from 'react';

import { apiClient } from '@/lib/api-client';
import { ApiError } from '@/lib/api-error';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

/**
 * Minimal data-fetch hook over {@link apiClient}. Phase 1 introduces React Query
 * for caching/mutations; this covers simple ad-hoc GETs with loading/error state.
 */
export function useApi<T>(): UseApiState<T> & { run: (path: string) => Promise<T | null> } {
  const [state, setState] = useState<UseApiState<T>>({ data: null, loading: false, error: null });

  const run = useCallback(async (path: string): Promise<T | null> => {
    setState({ data: null, loading: true, error: null });
    try {
      const data = await apiClient.get<T>(path);
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new ApiError('Terjadi kesalahan.', 0);
      setState({ data: null, loading: false, error: apiError });
      return null;
    }
  }, []);

  return { ...state, run };
}
