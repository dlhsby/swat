'use client';

import { useCallback, useEffect, useState } from 'react';

import { type ServerPaginationConfig } from '@/components/ui';
import { type ResourcePage } from '@/lib/resource-api';

/** Inputs the caller turns into a query string for one page request. */
export interface ServerQueryParams {
  /** 1-indexed page (backend convention). */
  page: number;
  pageSize: number;
  search: string;
}

export interface ServerResourceListState<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  loading: boolean;
  error: boolean;
  reload: () => Promise<void>;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSearch: (search: string) => void;
  /** Ready-made props for `<DataTable serverPagination={…} />` (0-indexed page). */
  serverPagination: ServerPaginationConfig;
}

/**
 * Server-side list state: fetches ONE page at a time and refetches whenever the
 * page, page size, search, or `buildQuery` (which closes over the caller's
 * filters) changes. Search/page-size/filter changes reset to page 1.
 *
 * `fetchPage` and `buildQuery` must be referentially stable (module-level api
 * method / `useCallback`) — `buildQuery` should depend on the caller's filter
 * state so a filter change triggers a refetch. Search is already debounced by the
 * DataTable before it reaches `setSearch`, so this hook does not debounce again.
 */
export function useServerResourceList<T>(
  fetchPage: (query: string) => Promise<ResourcePage<T>>,
  buildQuery: (params: ServerQueryParams) => string,
  // Default aligns with the DataTable's page-size options (10/25/50/100).
  initialPageSize = 25,
): ServerResourceListState<T> {
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [search, setSearchState] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(false);
    try {
      const result = await fetchPage(buildQuery({ page, pageSize, search }));
      setRows(result.rows);
      setTotal(result.total);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [fetchPage, buildQuery, page, pageSize, search]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Search / page-size / filter changes must restart from page 1.
  const setSearch = useCallback((value: string): void => {
    setSearchState(value);
    setPage(1);
  }, []);
  const setPageSize = useCallback((size: number): void => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  const serverPagination: ServerPaginationConfig = {
    page: page - 1, // hook is 1-indexed; the table is 0-indexed
    pageSize,
    total,
    onPageChange: (p) => setPage(p + 1),
    onPageSizeChange: setPageSize,
    onSearchChange: setSearch,
  };

  return {
    rows,
    total,
    page,
    pageSize,
    search,
    loading,
    error,
    reload,
    setPage,
    setPageSize,
    setSearch,
    serverPagination,
  };
}
