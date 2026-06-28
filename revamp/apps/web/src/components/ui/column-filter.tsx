'use client';

import { type Column, type FilterFn, type FilterFnOption } from '@tanstack/react-table';
import { Search, X } from 'lucide-react';

import { cn } from '@/lib/cn';
import { formatDateDisplay, formatDateForm } from '@/lib/format';

import { Input } from './input';

/** Column data type. Drives the filterFn only — every variant uses the same
 * contains-search text box. `date` additionally matches the displayed forms. */
export type FilterVariant = 'text' | 'number' | 'date';

/**
 * Searchable haystack for a row value. Dates match what the user actually sees
 * ("15 Mar 2026" and "15/03/2026") plus the raw ISO, so typing any of those
 * substrings hits. Numbers/strings match their plain string form.
 */
function searchableText(raw: unknown, variant: FilterVariant): string {
  if (raw == null) return '';
  if (variant === 'date' && typeof raw === 'string' && raw) {
    try {
      return `${formatDateDisplay(raw)} ${formatDateForm(raw)} ${raw}`;
    } catch {
      return raw;
    }
  }
  return String(raw);
}

/** Case-insensitive "contains" that also matches formatted dates. */
export const dateContainsFilterFn: FilterFn<unknown> = (row, columnId, value) => {
  const search = String(value ?? '')
    .toLowerCase()
    .trim();
  if (!search) return true;
  return searchableText(row.getValue(columnId), 'date').toLowerCase().includes(search);
};

/**
 * Map a column's declared variant to its filterFn. `number` and `text` use the
 * built-in string-contains (a number column otherwise defaults to a numeric
 * *range* matcher, which a plain text box can't drive); `date` uses the
 * formatted-aware contains so the user can type the date as shown.
 */
export function filterFnForVariant<TData>(variant: FilterVariant): FilterFnOption<TData> {
  if (variant === 'date') return dateContainsFilterFn as FilterFn<TData>;
  return 'includesString';
}

interface ColumnFilterProps<TData> {
  column: Column<TData, unknown>;
  label: string;
}

/** Per-column contains-search input with a leading magnifier + inline clear (×).
 *  A `min-w` keeps the box usable even under narrow columns (the column grows to
 *  fit rather than crushing the input); an active value gets a primary border. */
export function ColumnFilter<TData>({ column, label }: ColumnFilterProps<TData>): JSX.Element {
  const value = (column.getFilterValue() as string | undefined) ?? '';
  return (
    <div className="relative w-full min-w-[8.5rem]">
      <Search
        className="pointer-events-none absolute inset-y-0 left-2 my-auto h-3.5 w-3.5 text-neutral-400"
        aria-hidden
      />
      <Input
        value={value}
        // Empty → undefined so the column drops out of the active-filter count.
        onChange={(e) => column.setFilterValue(e.target.value || undefined)}
        placeholder="Filter…"
        aria-label={`Filter ${label}`}
        className={cn(
          'h-8 w-full pl-7 pr-7 text-body-sm font-normal',
          value && 'border-primary-600',
        )}
      />
      {value ? (
        <button
          type="button"
          onClick={() => column.setFilterValue(undefined)}
          aria-label={`Hapus filter ${label}`}
          className="absolute inset-y-0 right-0 flex items-center pr-2 text-neutral-400 transition-colors hover:text-neutral-700"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
