import { ChevronLeft, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/cn';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  /** Max numbered buttons before truncating with ellipsis. */
  siblingCount?: number;
}

/** Build the visible page list with leading/trailing ellipsis (`'…'`). */
export function paginationRange(
  page: number,
  totalPages: number,
  siblingCount = 1,
): (number | 'ellipsis')[] {
  const total = Math.max(1, totalPages);
  const totalNumbers = siblingCount * 2 + 5;
  if (total <= totalNumbers) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const left = Math.max(page - siblingCount, 1);
  const right = Math.min(page + siblingCount, total);
  const showLeftDots = left > 2;
  const showRightDots = right < total - 1;
  const range: (number | 'ellipsis')[] = [1];
  if (showLeftDots) range.push('ellipsis');
  for (let i = left; i <= right; i += 1) {
    if (i !== 1 && i !== total) range.push(i);
  }
  if (showRightDots) range.push('ellipsis');
  range.push(total);
  return range;
}

/**
 * Pagination (design-system §3.22) — standalone prev/next + numbered pages.
 * Current page filled primary-700; edges disabled.
 */
export function Pagination({
  page,
  totalPages,
  onPageChange,
  className,
  siblingCount = 1,
}: PaginationProps): JSX.Element {
  const pages = paginationRange(page, totalPages, siblingCount);
  const go = (p: number): void => {
    if (p >= 1 && p <= totalPages && p !== page) onPageChange(p);
  };

  return (
    <nav aria-label="Paginasi" className={cn('flex items-center gap-1', className)}>
      <button
        type="button"
        aria-label="Sebelumnya"
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        aria-disabled={page <= 1}
        className="inline-flex h-9 w-9 items-center justify-center rounded-base text-neutral-600 hover:bg-neutral-100 disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>
      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`e-${i}`} aria-hidden className="px-2 text-neutral-400">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => go(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(
              'inline-flex h-9 min-w-9 items-center justify-center rounded-base px-2 text-body-sm',
              p === page
                ? 'bg-primary-700 font-semibold text-white'
                : 'text-neutral-700 hover:bg-neutral-100',
            )}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        aria-label="Selanjutnya"
        onClick={() => go(page + 1)}
        disabled={page >= totalPages}
        aria-disabled={page >= totalPages}
        className="inline-flex h-9 w-9 items-center justify-center rounded-base text-neutral-600 hover:bg-neutral-100 disabled:pointer-events-none disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </nav>
  );
}
