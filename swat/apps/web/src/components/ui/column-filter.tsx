'use client';

import { type Column, type FilterFn, type FilterFnOption } from '@tanstack/react-table';

import { DatePicker } from './date-picker';
import { Input } from './input';

/** Column data type that drives which filter control + filterFn is used. */
export type FilterVariant = 'text' | 'number' | 'date';

/** `[min, max]` — either bound may be undefined (open-ended). */
type NumberRange = [number | undefined, number | undefined];
/** `[from, to]` ISO yyyy-MM-dd — either bound may be '' (open-ended). */
type DateRange = [string, string];

/**
 * Inclusive date-range filter. Row value is an ISO datetime string; the bounds
 * are ISO `yyyy-MM-dd`. Comparison is date-only (lexicographic on the date part,
 * valid for zero-padded ISO).
 */
export const dateRangeFilterFn: FilterFn<unknown> = (row, columnId, value) => {
  const [from, to] = (value ?? ['', '']) as DateRange;
  if (!from && !to) return true;
  const raw = row.getValue(columnId);
  if (typeof raw !== 'string' || !raw) return false;
  const day = raw.slice(0, 10);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
};

/** Map a column's declared variant to the right TanStack filterFn. The
 * date-range fn ignores `TData` (reads via `row.getValue`), so the cast is safe. */
export function filterFnForVariant<TData>(variant: FilterVariant): FilterFnOption<TData> {
  if (variant === 'number') return 'inNumberRange';
  if (variant === 'date') return dateRangeFilterFn as FilterFn<TData>;
  return 'includesString';
}

interface ColumnFilterProps<TData> {
  column: Column<TData, unknown>;
  variant: FilterVariant;
  label: string;
}

/**
 * Per-column filter control rendered under a header when the filter row is open.
 * Picks the input by the column's declared `meta.filterVariant`:
 *   - `text`   → contains-search input
 *   - `number` → min / max numeric range
 *   - `date`   → from / to date pickers
 * Clears the column filter (so it stops counting as "active") when emptied.
 */
export function ColumnFilter<TData>({
  column,
  variant,
  label,
}: ColumnFilterProps<TData>): JSX.Element {
  if (variant === 'number') {
    const [min, max] = (column.getFilterValue() as NumberRange | undefined) ?? [
      undefined,
      undefined,
    ];
    const update = (next: NumberRange): void => {
      column.setFilterValue(next[0] === undefined && next[1] === undefined ? undefined : next);
    };
    const toNum = (v: string): number | undefined => (v === '' ? undefined : Number(v));
    return (
      <div className="flex items-center gap-1">
        <Input
          type="number"
          inputMode="numeric"
          value={min ?? ''}
          onChange={(e) => update([toNum(e.target.value), max])}
          placeholder="Min"
          aria-label={`Filter ${label} minimum`}
          className="h-7 text-tiny font-normal"
        />
        <span className="text-tiny text-neutral-400">–</span>
        <Input
          type="number"
          inputMode="numeric"
          value={max ?? ''}
          onChange={(e) => update([min, toNum(e.target.value)])}
          placeholder="Maks"
          aria-label={`Filter ${label} maksimum`}
          className="h-7 text-tiny font-normal"
        />
      </div>
    );
  }

  if (variant === 'date') {
    const [from, to] = (column.getFilterValue() as DateRange | undefined) ?? ['', ''];
    const update = (next: DateRange): void => {
      column.setFilterValue(!next[0] && !next[1] ? undefined : next);
    };
    return (
      <div className="flex items-center gap-1">
        <DatePicker
          value={from || undefined}
          onValueChange={(v) => update([v ?? '', to])}
          placeholder="Dari"
          aria-describedby={undefined}
          className="h-7 px-2 text-tiny font-normal"
        />
        <span className="text-tiny text-neutral-400">–</span>
        <DatePicker
          value={to || undefined}
          onValueChange={(v) => update([from, v ?? ''])}
          placeholder="Sampai"
          aria-describedby={undefined}
          className="h-7 px-2 text-tiny font-normal"
        />
      </div>
    );
  }

  return (
    <Input
      value={(column.getFilterValue() as string) ?? ''}
      onChange={(e) => column.setFilterValue(e.target.value)}
      placeholder="Filter…"
      aria-label={`Filter ${label}`}
      className="h-7 text-tiny font-normal"
    />
  );
}
