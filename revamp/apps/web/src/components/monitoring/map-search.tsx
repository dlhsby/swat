'use client';

import { ChevronRight, Fuel, MapPin, Search, Truck, X, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Input, Popover, PopoverAnchor, PopoverContent } from '@/components/ui';
import { cn } from '@/lib/cn';

/** One searchable map entity (a vehicle or a site). */
export interface SearchEntry {
  readonly id: string;
  readonly kind: 'vehicle' | 'site';
  /** 'vehicle' for a truck; the site `type` (TPS/TPA/SPBU/POOL) for a site. */
  readonly type: string;
  /** Primary text — plate or site name. */
  readonly label: string;
  /** Secondary text — localized category (e.g. "TPS"). */
  readonly sublabel: string;
}

/** Category key an entry belongs to (drives the tabs + section grouping). */
function categoryOf(entry: SearchEntry): string {
  return entry.kind === 'vehicle' ? 'KENDARAAN' : entry.type.toUpperCase();
}

const CATEGORY_ORDER = ['KENDARAAN', 'TPS', 'TPA', 'SPBU', 'POOL'] as const;

/** Icon + tint per category, echoing the map marker colours. */
const CATEGORY_STYLE: Record<string, { icon: LucideIcon; cls: string }> = {
  KENDARAAN: { icon: Truck, cls: 'bg-success-50 text-success-700' },
  TPS: { icon: MapPin, cls: 'bg-primary-50 text-primary-700' },
  TPA: { icon: MapPin, cls: 'bg-danger-50 text-danger-700' },
  SPBU: { icon: Fuel, cls: 'bg-warning-50 text-warning-700' },
  POOL: { icon: MapPin, cls: 'bg-neutral-100 text-neutral-600' },
};

/** Concrete (never-undefined) style for an entry's category. */
function styleOf(entry: SearchEntry): { icon: LucideIcon; cls: string } {
  return (
    CATEGORY_STYLE[categoryOf(entry)] ?? { icon: MapPin, cls: 'bg-neutral-100 text-neutral-600' }
  );
}

function EntryRow({
  entry,
  onSelect,
}: {
  entry: SearchEntry;
  onSelect: (entry: SearchEntry) => void;
}): JSX.Element {
  const style = styleOf(entry);
  const Icon = style.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(entry)}
      className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-neutral-50"
    >
      <span
        className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-base', style.cls)}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm font-medium text-neutral-900">
          {entry.label}
        </span>
        <span className="block truncate text-tiny text-neutral-500">{entry.sublabel}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
    </button>
  );
}

const RECENT_CAP = 8;

/**
 * A smart map search (mirrors the Sekar mobile "Pencarian"): typeahead across
 * vehicles + sites with category tabs and counts, and — when the box is empty — a
 * "Terakhir dilihat" list of the last-selected items (persisted in localStorage),
 * clearable via "Hapus semua". Selecting an item focuses it on the map.
 */
export function MapSearch({
  entries,
  onSelect,
  storageKey = 'swat-map-search-recent',
}: {
  entries: readonly SearchEntry[];
  onSelect: (entry: SearchEntry) => void;
  storageKey?: string;
}): JSX.Element {
  const t = useTranslations('dashboard');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string>('ALL');
  const [recent, setRecent] = useState<SearchEntry[]>([]);
  const anchorRef = useRef<HTMLDivElement>(null);

  // Load recent history once on mount (client only).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setRecent(JSON.parse(raw) as SearchEntry[]);
    } catch {
      // Corrupt/blocked storage → just start with no history.
    }
  }, [storageKey]);

  const persistRecent = (next: SearchEntry[]): void => {
    setRecent(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Ignore quota/permission errors — history is best-effort.
    }
  };

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return entries.filter(
      (e) => e.label.toLowerCase().includes(q) || e.sublabel.toLowerCase().includes(q),
    );
  }, [entries, query]);

  // Categories present among the matches, in canonical order, with counts.
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of matches) counts.set(categoryOf(m), (counts.get(categoryOf(m)) ?? 0) + 1);
    return CATEGORY_ORDER.filter((c) => counts.has(c)).map((c) => ({
      key: c,
      count: counts.get(c) ?? 0,
    }));
  }, [matches]);

  const visible = useMemo(
    () => (activeCat === 'ALL' ? matches : matches.filter((m) => categoryOf(m) === activeCat)),
    [matches, activeCat],
  );

  // Group the visible matches into sections by category (canonical order).
  const sections = useMemo(
    () =>
      CATEGORY_ORDER.map((c) => ({
        key: c,
        items: visible.filter((m) => categoryOf(m) === c),
      })).filter((s) => s.items.length > 0),
    [visible],
  );

  const catLabel = (key: string): string => t(`searchCat${key}` as 'searchCatKENDARAAN');

  const select = (entry: SearchEntry): void => {
    onSelect(entry);
    persistRecent(
      [entry, ...recent.filter((r) => !(r.id === entry.id && r.kind === entry.kind))].slice(
        0,
        RECENT_CAP,
      ),
    );
    setQuery('');
    setActiveCat('ALL');
    setOpen(false);
  };

  const insideAnchor = (target: EventTarget | null): boolean =>
    target instanceof Node && (anchorRef.current?.contains(target) ?? false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div ref={anchorRef} className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
            aria-hidden
          />
          <Input
            type="text"
            autoComplete="off"
            placeholder={t('searchMap')}
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveCat('ALL');
              setOpen(true);
            }}
            className="pl-9 pr-9"
          />
          {query ? (
            <button
              type="button"
              aria-label={t('searchClear')}
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="end"
        className="w-[min(92vw,360px)] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onFocusOutside={(e) => {
          if (insideAnchor(e.target)) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (insideAnchor(e.target)) e.preventDefault();
        }}
      >
        <div className="max-h-[420px] overflow-y-auto py-1">
          {query.trim() === '' ? (
            // Empty box → "Terakhir dilihat" history.
            <>
              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="text-label font-medium text-neutral-500">{t('searchRecent')}</span>
                {recent.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => persistRecent([])}
                    className="text-tiny font-medium text-danger-600 hover:underline"
                  >
                    {t('searchClearAll')}
                  </button>
                ) : null}
              </div>
              {recent.length === 0 ? (
                <p className="px-3 py-6 text-center text-body-sm text-neutral-500">
                  {t('searchRecentEmpty')}
                </p>
              ) : (
                recent.map((entry) => (
                  <EntryRow key={`${entry.kind}:${entry.id}`} entry={entry} onSelect={select} />
                ))
              )}
            </>
          ) : matches.length === 0 ? (
            <p className="px-3 py-6 text-center text-body-sm text-neutral-500">
              {t('searchNoResults')}
            </p>
          ) : (
            <>
              {/* Category tabs with counts (SEMUA + per-type). */}
              <div className="flex items-center gap-1.5 overflow-x-auto border-b border-neutral-100 px-3 py-2">
                <CategoryChip
                  label={t('searchCatALL')}
                  count={matches.length}
                  active={activeCat === 'ALL'}
                  onClick={() => setActiveCat('ALL')}
                />
                {categories.map((c) => (
                  <CategoryChip
                    key={c.key}
                    label={catLabel(c.key)}
                    count={c.count}
                    active={activeCat === c.key}
                    onClick={() => setActiveCat(c.key)}
                  />
                ))}
              </div>
              {sections.map((section) => (
                <div key={section.key} className="py-1">
                  <p className="px-3 py-1 text-label font-medium uppercase text-neutral-500">
                    {catLabel(section.key)}
                  </p>
                  {section.items.map((entry) => (
                    <EntryRow key={`${entry.kind}:${entry.id}`} entry={entry} onSelect={select} />
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** A pill filter with a count badge for the category tabs. */
function CategoryChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-tiny font-medium transition-colors',
        active
          ? 'border-primary-700 bg-primary-700 text-white'
          : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50',
      )}
    >
      {label}
      <span
        className={cn(
          'rounded-full px-1.5 text-tiny tabular-nums',
          active ? 'bg-white/25' : 'bg-neutral-100 text-neutral-600',
        )}
      >
        {count}
      </span>
    </button>
  );
}
