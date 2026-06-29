'use client';

import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  type Table as TanstackTable,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Filter,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import { cn } from '@/lib/cn';

import { Button } from './button';
import { ColumnFilter, type FilterVariant, filterFnForVariant } from './column-filter';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { EmptyState } from './empty-state';
import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Skeleton } from './skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

// Surface a human label per column for the column-toggle menu and mobile cards.
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    label?: string;
    /** Hidden on first render; user can reveal it via the column-toggle menu. */
    defaultHidden?: boolean;
    /** Column data type — selects the per-column filter control + filterFn.
     * Defaults to `text` (contains-search) when omitted. */
    filterVariant?: FilterVariant;
    /** Pin to the right edge (sticky) — e.g. an actions column — so the data
     * columns scroll horizontally underneath it. */
    pinRight?: boolean;
    /** Pin to the left edge (sticky) — e.g. a row-number column. */
    pinLeft?: boolean;
  }
}

const PAGE_SIZES = [10, 25, 50, 100] as const;

/**
 * Opt-in server-side pagination. When provided, the table renders exactly the
 * `data` page the server returned (no client slice/filter/sort), drives the pager
 * from the server `total`, and routes the search box to `onSearchChange`
 * (already debounced 300ms by the table). Per-column filters are hidden in this
 * mode — use the global search + a toolbar filter. Sort stays client-visual only.
 */
export interface ServerPaginationConfig {
  /** 0-indexed current page. */
  page: number;
  pageSize: number;
  /** Total rows across all pages. */
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  /** Fired with the debounced search text (empty string clears). */
  onSearchChange: (search: string) => void;
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  /** Global search box; omit to hide the toolbar search. */
  searchPlaceholder?: string;
  /** Column-toggle control. Defaults on. */
  enableColumnToggle?: boolean;
  /** Empty-state action ([Buat Baru]). */
  emptyAction?: ReactNode;
  emptyTitle?: string;
  /** Extra toolbar content (filters) rendered between search and column-toggle. */
  toolbar?: ReactNode;
  /** Reload the grid's data; renders a refresh button after the column-toggle. */
  onRefresh?: () => void;
  /** Spins the refresh button while a reload is in flight. */
  refreshing?: boolean;
  /** Primary action(s) (e.g. [Buat Baru]) shown at the toolbar's right edge,
   * after the column-toggle, so the data controls sit together. */
  actions?: ReactNode;
  /** Per-row mobile card title accessor. */
  getRowId?: (row: TData) => string;
  /** Opt into server-side pagination/search (large tables). Omit for client mode. */
  serverPagination?: ServerPaginationConfig;
  className?: string;
}

/** Debounce a changing value by `delay` ms. */
function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/**
 * DataTable (design-system §3.11) — TanStack Table + shadcn Table with toolbar
 * search (300ms debounce), column-toggle, sortable headers, client pagination,
 * and the full state matrix (loading / empty / no-results / error). Collapses to
 * stacked cards below md.
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  error = false,
  onRetry,
  searchPlaceholder,
  enableColumnToggle = true,
  emptyAction,
  emptyTitle = 'Belum ada data',
  toolbar,
  onRefresh,
  refreshing = false,
  actions,
  serverPagination,
  className,
}: DataTableProps<TData, TValue>): JSX.Element {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    // Columns flagged meta.defaultHidden start hidden (revealable via the toggle).
    const v: VisibilityState = {};
    for (const c of columns) {
      if (c.meta?.defaultHidden) {
        const id = c.id ?? ('accessorKey' in c ? String(c.accessorKey) : undefined);
        if (id) v[id] = false;
      }
    }
    return v;
  });
  const [globalFilter, setGlobalFilter] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);
  const [pageIndex, setPageIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Assign each filterable column the filterFn matching its declared variant
  // (number → range, date → date-range), unless the page set one explicitly.
  const resolvedColumns = useMemo(
    () =>
      columns.map((c) => {
        const variant = c.meta?.filterVariant;
        if (!variant || variant === 'text' || c.filterFn) return c;
        return { ...c, filterFn: filterFnForVariant<TData>(variant) };
      }),
    [columns],
  );

  const debouncedSearch = useDebounced(search, 300);
  // In server mode the search drives a refetch (the hook resets to page 1); in
  // client mode it drives the local global filter. `onSearchChange` is the hook's
  // stable `setSearch`, so depending on it can't loop but stays correct if the
  // mode/handler ever changes.
  const onServerSearch = serverPagination?.onSearchChange;
  useEffect(() => {
    if (onServerSearch) {
      onServerSearch(debouncedSearch);
      return;
    }
    setGlobalFilter(debouncedSearch);
    setPageIndex(0);
  }, [debouncedSearch, onServerSearch]);
  // Reset to page 1 whenever the per-column filters change.
  useEffect(() => {
    setPageIndex(0);
  }, [columnFilters]);

  const table = useReactTable({
    data,
    columns: resolvedColumns,
    state: { sorting, columnFilters, columnVisibility, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    // Server mode: the server already filtered/sorted/paged — skip the client
    // row models so the table renders exactly the page it was handed.
    ...(serverPagination
      ? { manualPagination: true, manualFiltering: true, manualSorting: true }
      : { getFilteredRowModel: getFilteredRowModel(), getSortedRowModel: getSortedRowModel() }),
  });

  const allRows = table.getRowModel().rows;
  // Client mode slices the filtered/sorted rows; server mode renders the page as-is.
  const serverTotalPages = serverPagination
    ? Math.max(1, Math.ceil(serverPagination.total / serverPagination.pageSize))
    : 1;
  const totalRows = serverPagination ? serverPagination.total : allRows.length;
  const totalPages = serverPagination
    ? serverTotalPages
    : Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = serverPagination ? serverPagination.page : Math.min(pageIndex, totalPages - 1);
  const pageRows = serverPagination
    ? allRows
    : allRows.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const hasSearch = searchPlaceholder !== undefined;
  const isFiltered =
    globalFilter.length > 0 ||
    columnFilters.length > 0 ||
    (serverPagination !== undefined && search.length > 0);

  const colCount = table.getVisibleLeafColumns().length || 1;
  // Per-column filters don't apply in server mode (they'd filter only the current
  // page) — rely on the global search + a toolbar filter instead.
  const hasFilterableColumns =
    serverPagination === undefined && table.getAllColumns().some((c) => c.getCanFilter());
  const showToolbar =
    hasSearch ||
    Boolean(toolbar) ||
    enableColumnToggle ||
    Boolean(onRefresh) ||
    Boolean(actions) ||
    hasFilterableColumns;

  return (
    <div className={cn('space-y-3', className)}>
      {showToolbar ? (
        <div className="flex flex-wrap items-center gap-2">
          {hasSearch ? (
            // Compact magnifier that expands to fit its placeholder on focus (or
            // while it has a value); full-width on mobile, capped on desktop.
            <div
              className={cn(
                'transition-[width] duration-200',
                searchFocused || search.length > 0 ? 'w-full sm:w-80' : 'w-10',
              )}
            >
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder={searchPlaceholder}
                leading={<Search className="h-4 w-4" aria-hidden />}
                aria-label="Cari"
                className="w-full"
              />
            </div>
          ) : null}
          {toolbar}
          {enableColumnToggle || actions || onRefresh || hasFilterableColumns ? (
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              {hasFilterableColumns ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters((v) => !v)}
                  aria-pressed={showFilters}
                  title={
                    columnFilters.length > 0
                      ? `${columnFilters.length} filter aktif`
                      : 'Filter per kolom'
                  }
                  className={cn(
                    (showFilters || columnFilters.length > 0) &&
                      'border-primary-700 bg-primary-50 text-primary-700 hover:bg-primary-100 dark:text-primary-400',
                  )}
                >
                  <Filter className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">Filter</span>
                  {columnFilters.length > 0 ? (
                    <span
                      className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-700 px-1 text-tiny font-semibold tabular-nums text-white"
                      aria-label={`${columnFilters.length} filter aktif`}
                    >
                      {columnFilters.length}
                    </span>
                  ) : null}
                </Button>
              ) : null}
              {hasFilterableColumns && columnFilters.length > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => table.resetColumnFilters()}
                  title="Hapus semua filter kolom"
                >
                  <X className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">Hapus Filter</span>
                </Button>
              ) : null}
              {enableColumnToggle ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <SlidersHorizontal className="h-4 w-4" aria-hidden />
                      <span className="hidden sm:inline">Kolom</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Tampilkan kolom</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {table
                      .getAllColumns()
                      .filter((c) => c.getCanHide())
                      .map((column) => (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) => column.toggleVisibility(!!value)}
                          onSelect={(e) => e.preventDefault()}
                        >
                          {String(column.columnDef.meta?.label ?? column.id)}
                        </DropdownMenuCheckboxItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
              {onRefresh ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={refreshing}
                  aria-label="Muat ulang"
                  title="Muat ulang data"
                >
                  <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} aria-hidden />
                  <span className="hidden sm:inline">Muat Ulang</span>
                </Button>
              ) : null}
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Desktop table (md+) */}
      <div className="hidden overflow-hidden rounded-lg border border-neutral-200 bg-neutral-0 shadow-base md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((header) => {
                  const sortable = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        (header.column.columnDef.meta?.pinLeft ||
                          header.column.columnDef.meta?.pinRight) &&
                          'z-[15] bg-neutral-50',
                        header.column.columnDef.meta?.pinLeft &&
                          'left-0 border-r border-neutral-200',
                        header.column.columnDef.meta?.pinRight &&
                          'right-0 border-l border-neutral-200',
                      )}
                      aria-sort={
                        sorted === 'asc'
                          ? 'ascending'
                          : sorted === 'desc'
                            ? 'descending'
                            : sortable
                              ? 'none'
                              : undefined
                      }
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={cn(
                            'flex flex-col gap-1.5',
                            showFilters && header.column.getCanFilter() && 'gap-2 pb-2 pt-1',
                          )}
                        >
                          {sortable ? (
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              title="Klik untuk mengurutkan · Shift+klik untuk beberapa kolom"
                              className="-ml-1 inline-flex w-fit items-center gap-1 rounded-sm px-1 hover:text-neutral-900"
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {sorted === 'asc' ? (
                                <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                              ) : sorted === 'desc' ? (
                                <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                              ) : (
                                <ChevronsUpDown
                                  className="h-3.5 w-3.5 text-neutral-400"
                                  aria-hidden
                                />
                              )}
                              {sorted && sorting.length > 1 ? (
                                <span className="ml-0.5 rounded bg-neutral-200 px-1 text-tiny tabular-nums text-neutral-600">
                                  {header.column.getSortIndex() + 1}
                                </span>
                              ) : null}
                            </button>
                          ) : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )}
                          {showFilters && header.column.getCanFilter() ? (
                            <ColumnFilter
                              column={header.column}
                              label={String(
                                header.column.columnDef.meta?.label ?? header.column.id,
                              )}
                            />
                          ) : null}
                        </div>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 10 }).map((_, r) => (
                <TableRow key={`sk-${r}`} className="hover:bg-transparent">
                  {Array.from({ length: colCount }).map((__, c) => (
                    <TableCell key={`sk-${r}-${c}`}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : error ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={colCount}>
                  <EmptyState
                    illustration="server-error"
                    title="Gagal memuat data"
                    action={
                      onRetry ? (
                        <Button variant="secondary" size="sm" onClick={onRetry}>
                          Coba Lagi
                        </Button>
                      ) : undefined
                    }
                  />
                </TableCell>
              </TableRow>
            ) : pageRows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={colCount}>
                  {isFiltered ? (
                    <EmptyState illustration="no-results" title="Tidak ada hasil pencarian" />
                  ) : (
                    <EmptyState illustration="empty" title={emptyTitle} action={emptyAction} />
                  )}
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row, idx) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? 'selected' : undefined}
                  className={cn('group hover:bg-neutral-100', idx % 2 === 1 && 'bg-neutral-50/60')}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        (cell.column.columnDef.meta?.pinLeft ||
                          cell.column.columnDef.meta?.pinRight) &&
                          cn(
                            'sticky z-[5] group-hover:bg-neutral-100',
                            cell.column.columnDef.meta?.pinLeft &&
                              'left-0 border-r border-neutral-200',
                            cell.column.columnDef.meta?.pinRight &&
                              'right-0 border-l border-neutral-200',
                            // Opaque bg (matching the row stripe) so scrolled cells
                            // don't show through the pinned column.
                            idx % 2 === 1 ? 'bg-neutral-50' : 'bg-neutral-0',
                          ),
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards (< md) */}
      <div className="space-y-2 md:hidden">
        {loading ? (
          Array.from({ length: 6 }).map((_, r) => (
            <div key={`mc-${r}`} className="rounded-lg border border-neutral-200 p-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-2 h-3 w-1/2" />
            </div>
          ))
        ) : error ? (
          <EmptyState
            illustration="server-error"
            title="Gagal memuat data"
            action={
              onRetry ? (
                <Button variant="secondary" size="sm" onClick={onRetry}>
                  Coba Lagi
                </Button>
              ) : undefined
            }
          />
        ) : pageRows.length === 0 ? (
          isFiltered ? (
            <EmptyState illustration="no-results" title="Tidak ada hasil pencarian" />
          ) : (
            <EmptyState illustration="empty" title={emptyTitle} action={emptyAction} />
          )
        ) : (
          pageRows.map((row) => (
            <div key={row.id} className="rounded-lg border border-neutral-200 bg-neutral-0 p-3">
              <dl className="divide-y divide-neutral-100">
                {row.getVisibleCells().map((cell) => (
                  <div
                    key={cell.id}
                    className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                  >
                    <dt className="text-tiny font-medium text-neutral-500">
                      {String(cell.column.columnDef.meta?.label ?? cell.column.id)}
                    </dt>
                    <dd className="text-right text-body-sm text-neutral-900">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))
        )}
      </div>

      {!loading && !error && totalRows > 0 ? (
        <DataTablePagination
          table={table}
          page={safePage}
          pageSize={serverPagination ? serverPagination.pageSize : pageSize}
          totalRows={totalRows}
          totalPages={totalPages}
          onPageChange={serverPagination ? serverPagination.onPageChange : setPageIndex}
          onPageSizeChange={(s) => {
            if (serverPagination) {
              serverPagination.onPageSizeChange(s);
              return;
            }
            setPageSize(s);
            setPageIndex(0);
          }}
        />
      ) : null}
    </div>
  );
}

interface PaginationBarProps<TData> {
  table: TanstackTable<TData>;
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

function DataTablePagination<TData>({
  page,
  pageSize,
  totalRows,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: PaginationBarProps<TData>): JSX.Element {
  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, totalRows);
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-body-sm text-neutral-500">
        Menampilkan {from}–{to} dari {totalRows}
      </p>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 0}
            onClick={() => onPageChange(page - 1)}
          >
            Sebelumnya
          </Button>
          <span className="text-body-sm text-neutral-600">
            Halaman {page + 1} dari {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => onPageChange(page + 1)}
          >
            Selanjutnya
          </Button>
        </div>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger className="h-9 w-[5.5rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((s) => (
              <SelectItem key={s} value={String(s)}>
                {s} / hlm
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
