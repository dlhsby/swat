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
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

import { cn } from '@/lib/cn';

import { Button } from './button';
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
  }
}

const PAGE_SIZES = [10, 25, 50, 100] as const;

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
  /** Primary action(s) (e.g. [Buat Baru]) shown at the toolbar's right edge,
   * after the column-toggle, so the data controls sit together. */
  actions?: ReactNode;
  /** Per-row mobile card title accessor. */
  getRowId?: (row: TData) => string;
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
  actions,
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

  const debouncedSearch = useDebounced(search, 300);
  useEffect(() => {
    setGlobalFilter(debouncedSearch);
    setPageIndex(0);
  }, [debouncedSearch]);
  // Reset to page 1 whenever the per-column filters change.
  useEffect(() => {
    setPageIndex(0);
  }, [columnFilters]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, columnVisibility, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const allRows = table.getRowModel().rows;
  const totalRows = allRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(pageIndex, totalPages - 1);
  const pageRows = allRows.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const hasSearch = searchPlaceholder !== undefined;
  const isFiltered = globalFilter.length > 0 || columnFilters.length > 0;

  const colCount = table.getVisibleLeafColumns().length || 1;
  const hasFilterableColumns = table.getAllColumns().some((c) => c.getCanFilter());
  const showToolbar =
    hasSearch || Boolean(toolbar) || enableColumnToggle || Boolean(actions) || hasFilterableColumns;

  return (
    <div className={cn('space-y-3', className)}>
      {showToolbar ? (
        <div className="flex flex-wrap items-center gap-2">
          {hasSearch ? (
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              leading={<Search className="h-4 w-4" aria-hidden />}
              aria-label="Cari"
              className="max-w-xs"
            />
          ) : null}
          {toolbar}
          {enableColumnToggle || actions || hasFilterableColumns ? (
            <div className="ml-auto flex items-center gap-2">
              {hasFilterableColumns ? (
                <Button
                  variant={showFilters ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setShowFilters((v) => !v)}
                  aria-pressed={showFilters}
                >
                  <Filter className="h-4 w-4" aria-hidden />
                  Filter
                </Button>
              ) : null}
              {enableColumnToggle ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <SlidersHorizontal className="h-4 w-4" aria-hidden />
                      Kolom
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
                        <div className="flex flex-col gap-1.5">
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
                            <Input
                              value={(header.column.getFilterValue() as string) ?? ''}
                              onChange={(e) => header.column.setFilterValue(e.target.value)}
                              placeholder="Filter…"
                              aria-label={`Filter ${String(
                                header.column.columnDef.meta?.label ?? header.column.id,
                              )}`}
                              className="h-7 text-tiny font-normal"
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
                  className={cn('hover:bg-neutral-100', idx % 2 === 1 && 'bg-neutral-50/60')}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
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
          pageSize={pageSize}
          totalRows={totalRows}
          totalPages={totalPages}
          onPageChange={setPageIndex}
          onPageSizeChange={(s) => {
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
