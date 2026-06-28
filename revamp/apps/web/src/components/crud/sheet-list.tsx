'use client';

import { type ReactNode, useEffect, useState } from 'react';

import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { formatNumber } from '@/lib/format';

/**
 * Shared building blocks for the per-row sub-resource sheets (Pemeriksaan /
 * Perawatan / Sumber Sampah / SIM / Template Trip). Each sheet fetches one
 * parent's bounded set, then filters + pages it in memory — these helpers keep
 * that filter bar, result count, and "load more" behaviour identical everywhere.
 */

/** Sentinel value for the leading "all / no filter" option in a {@link FilterSelect}. */
export const ALL_FILTER = 'ALL';

export interface WindowedList<T> {
  /** The current page-limited slice to render. */
  readonly windowed: T[];
  /** How many rows are still hidden beyond the window. */
  readonly remaining: number;
  /** Grow the window by one page. */
  readonly loadMore: () => void;
}

/**
 * Client-side windowing for an already-filtered list. Resets to the first page
 * whenever `resetKey` changes — pass a string built from the active filters so
 * changing a filter starts paging over from the top.
 */
export function useWindowedList<T>(items: T[], resetKey: unknown, pageSize = 10): WindowedList<T> {
  const [visible, setVisible] = useState(pageSize);
  useEffect(() => {
    setVisible(pageSize);
  }, [resetKey, pageSize]);
  return {
    windowed: items.slice(0, visible),
    remaining: Math.max(0, items.length - visible),
    loadMore: () => setVisible((v) => v + pageSize),
  };
}

/** Full-width "Muat lebih banyak (N lagi)" control; renders nothing when done. */
export function LoadMoreButton({
  remaining,
  onClick,
}: {
  remaining: number;
  onClick: () => void;
}): JSX.Element | null {
  if (remaining <= 0) {
    return null;
  }
  return (
    <Button variant="outline" className="w-full" onClick={onClick}>
      Muat lebih banyak ({formatNumber(remaining)} lagi)
    </Button>
  );
}

/** Dropdown filter with a leading "all" sentinel option (value {@link ALL_FILTER}). */
export function FilterSelect({
  value,
  onValueChange,
  allLabel,
  options,
  className = 'h-9 w-[150px]',
}: {
  value: string;
  onValueChange: (value: string) => void;
  allLabel: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  className?: string;
}): JSX.Element {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_FILTER}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Standard sheet filter bar: a wrapping row of controls above a tiny result
 * summary. Shown only when there is data to filter (the caller decides).
 */
export function SheetFilterBar({
  children,
  summary,
}: {
  children: ReactNode;
  summary: ReactNode;
}): JSX.Element {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">{children}</div>
      <p className="text-tiny text-neutral-500">{summary}</p>
    </div>
  );
}
