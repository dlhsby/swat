'use client';

import { Check, Pencil, Trash2 } from 'lucide-react';

import { Badge, Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { type CorridorDto } from '@/lib/corridor-api';
import { formatNumber } from '@/lib/format';

/** Name + "Utama" badge + length — the shared body of every corridor row. */
function CorridorMeta({ corridor }: { corridor: CorridorDto }): JSX.Element {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className="truncate text-body-sm font-medium">{corridor.name}</span>
        {corridor.isDefault ? <Badge appearance="count">Utama</Badge> : null}
      </div>
      <p className="text-tiny text-neutral-500 tabular-nums">
        {formatNumber(corridor.lengthMeters)} m
      </p>
    </div>
  );
}

export interface CorridorListItemProps {
  corridor: CorridorDto;
  /** Render as a selectable option (radio-like button + check) instead of a manage row. */
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  /** Manage-row actions; omit `onDelete` to hide delete (e.g. the route's default). */
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * One corridor row, shared by the route Koridor manager and the template / per-day
 * pickers (Phase 7.8) so badge, length, and styling stay identical everywhere.
 * `selectable` renders a radio-style option (used by the pickers); otherwise it's a
 * manage row with optional edit/delete actions (used by the route manager). Returns
 * an `<li>` — callers wrap it in a `<ul>`.
 */
export function CorridorListItem({
  corridor,
  selectable = false,
  selected = false,
  onSelect,
  onEdit,
  onDelete,
}: CorridorListItemProps): JSX.Element {
  if (selectable) {
    return (
      <li>
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          className={cn(
            'flex w-full items-center justify-between gap-3 rounded-base border px-3 py-2.5 text-left transition-colors',
            selected
              ? 'border-primary-700 bg-primary-50 dark:text-primary-400'
              : 'border-neutral-200 hover:bg-neutral-50',
          )}
        >
          <CorridorMeta corridor={corridor} />
          {selected ? (
            <Check
              className="h-4 w-4 shrink-0 text-primary-700 dark:text-primary-400"
              aria-hidden
            />
          ) : null}
        </button>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-base border border-neutral-200 px-3 py-2.5">
      <CorridorMeta corridor={corridor} />
      <div className="flex shrink-0 gap-1">
        {onEdit ? (
          <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Ubah ${corridor.name}`}>
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>
        ) : null}
        {onDelete ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-danger-600"
            onClick={onDelete}
            aria-label={`Hapus ${corridor.name}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        ) : null}
      </div>
    </li>
  );
}
