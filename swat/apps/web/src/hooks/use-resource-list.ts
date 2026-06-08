'use client';

import { useCallback, useEffect, useState } from 'react';

export interface ResourceListState<T> {
  rows: T[];
  loading: boolean;
  error: boolean;
  reload: () => Promise<void>;
}

/**
 * Fetch a list once on mount with loading/error state and a manual reload.
 * `loader` must be referentially stable (a module-level api method or a
 * `useCallback`) so the effect does not re-run every render.
 */
export function useResourceList<T>(loader: () => Promise<T[]>): ResourceListState<T> {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(false);
    try {
      setRows(await loader());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [loader]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { rows, loading, error, reload };
}
