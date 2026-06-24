'use client';

import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type KeyboardEvent, type MouseEvent, useRef, useState } from 'react';
import { type DateRange as RdpDateRange } from 'react-day-picker';

import { Button, Calendar, Popover, PopoverContent, PopoverTrigger } from '@/components/ui';
import { cn } from '@/lib/cn';
import { type DateRange } from '@/lib/monitoring-api';
import { type PresetKey, datePresets } from '@/lib/monitoring-charts';

/** Chip order (mirrors the hi-fi range picker): two rows of five. */
const PRESET_ORDER: readonly PresetKey[] = [
  'today',
  'prevDay',
  'last7',
  'thisMonth',
  'lastMonth',
  'last1m',
  'last3m',
  'last6m',
  'ytd',
  'last1y',
];

/** ISO `yyyy-MM-dd` → local-midnight Date (display only), matching DatePicker. */
function parseIso(value: string): Date | undefined {
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

const toIso = (date: Date): string => format(date, 'yyyy-MM-dd');

/** Shift an ISO `yyyy-MM-dd` by `delta` days (UTC-anchored, month-safe). */
function shiftIso(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + delta)).toISOString().slice(0, 10);
}

/** Compact `d MMM yy` label, e.g. `24 Jun 26`. */
function label(value: string): string {
  const d = parseIso(value);
  return d ? format(d, 'd MMM yy', { locale: idLocale }) : value;
}

/**
 * Monitoring date-range filter: a single trigger showing the active range that
 * opens a two-month range calendar plus quick-range chips (default "Hari Ini").
 *
 * Controlled — the page owns the range. The popover opens with NO in-progress
 * selection so the first day-click sets the start (popover stays open, end can be
 * hover-previewed) and the second click sets the end, commits, and closes. A
 * preset chip commits immediately. Closing without a complete range discards it.
 */
export function DateRangeControl({
  value,
  today,
  onChange,
}: {
  value: DateRange;
  today: string;
  onChange: (range: DateRange) => void;
}): JSX.Element {
  const t = useTranslations('monitoring.range');
  const [open, setOpen] = useState(false);
  // Two-click range driven by hand: `start` is the chosen first endpoint and
  // `hovered` is the day under the cursor, so we can render a LIVE preview band
  // (start → hovered) while picking the end. The trigger stays pinned to the
  // committed value (it never reflects the in-progress pick) so the popover
  // doesn't shift. The committed range is shown highlighted when not picking.
  const [start, setStart] = useState<Date | undefined>(undefined);
  const [hovered, setHovered] = useState<Date | undefined>(undefined);
  const picking = start !== undefined;
  // Gate the hover preview behind a REAL pointer displacement: clicking the start
  // can emit a stray `mouseenter`/`pointermove` (from the re-render, same cursor
  // position) that would otherwise band the start to today. We only honour
  // mouseenter once the pointer has moved >4px away from where the start was
  // clicked — i.e. the user is actually sweeping toward an end date.
  const armed = useRef(false);
  const clickPoint = useRef<{ x: number; y: number } | null>(null);

  const presets = datePresets(today);
  const activePreset = PRESET_ORDER.find(
    (key) => presets[key].dateFrom === value.dateFrom && presets[key].dateTo === value.dateTo,
  );

  const triggerLabel =
    value.dateFrom === value.dateTo
      ? label(value.dateFrom)
      : `${label(value.dateFrom)} – ${label(value.dateTo)}`;

  // A single-day committed value gets prev/next day steppers; a multi-day range
  // hides them. Based on the committed value only, so the trigger stays stable
  // while picking. Next is clamped at today (future dates are out of scope).
  const isSingleDay = value.dateFrom === value.dateTo;
  const canStepNext = value.dateTo < today;
  const stepDay = (delta: number): void => {
    const next = shiftIso(value.dateFrom, delta);
    if (delta > 0 && next > today) return;
    onChange({ dateFrom: next, dateTo: next });
  };

  const reset = (): void => {
    setStart(undefined);
    setHovered(undefined);
    armed.current = false;
    clickPoint.current = null;
  };
  const commit = (range: DateRange): void => {
    reset();
    onChange(range);
    setOpen(false);
  };

  // The range rdp highlights: while picking, show the start alone until the
  // cursor is on a LATER day, then preview start→hovered. Hovering on/before the
  // start shows just the start (no band). Otherwise, the committed value.
  const selectedRange: RdpDateRange | undefined =
    picking && start
      ? hovered && hovered > start
        ? { from: start, to: hovered }
        : { from: start, to: start }
      : { from: parseIso(value.dateFrom), to: parseIso(value.dateTo) };

  // Controlled selection (via onSelect) so react-day-picker renders OUR `selected`
  // and runs no internal range preview. We ignore rdp's computed range and drive
  // everything from the clicked day: first click sets the start; then an EARLIER
  // day becomes the new start, the SAME day commits a single-day pick, and a LATER
  // day commits the range. `e` (the click) anchors the move-gate for the preview.
  const onSelect = (
    _range: RdpDateRange | undefined,
    day: Date,
    _modifiers: unknown,
    e: MouseEvent | KeyboardEvent,
  ): void => {
    if (start === undefined || toIso(day) < toIso(start)) {
      setStart(day);
      setHovered(undefined);
      armed.current = false;
      clickPoint.current = 'clientX' in e ? { x: e.clientX, y: e.clientY } : null;
      return;
    }
    commit({ dateFrom: toIso(start), dateTo: toIso(day) });
  };
  // Arm the preview only once the pointer has genuinely moved off the click point.
  const onPointerMove = (e: { clientX: number; clientY: number }): void => {
    const anchor = clickPoint.current;
    if (!anchor) return;
    const dx = e.clientX - anchor.x;
    const dy = e.clientY - anchor.y;
    if (dx * dx + dy * dy > 16) armed.current = true;
  };
  // Honoured only after a real pointer move (see `armed`), and never into the future.
  const onDayMouseEnter = (day: Date): void => {
    if (picking && armed.current && toIso(day) <= today) setHovered(day);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        reset(); // start each session fresh; discard half-finished picks
      }}
    >
      <div className="inline-flex items-center gap-1">
        {isSingleDay ? (
          <Button
            variant="outline"
            size="sm"
            className="w-8 px-0"
            aria-label={t('prevDay')}
            onClick={() => stepDay(-1)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
        ) : null}
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 font-medium">
            <CalendarIcon className="h-4 w-4 text-neutral-500" aria-hidden />
            <span className="tabular-nums">{triggerLabel}</span>
          </Button>
        </PopoverTrigger>
        {isSingleDay ? (
          <Button
            variant="outline"
            size="sm"
            className="w-8 px-0"
            aria-label="Hari berikutnya"
            disabled={!canStepNext}
            onClick={() => stepDay(1)}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        ) : null}
      </div>
      <PopoverContent align="start" className="w-auto p-0">
        {/* Arm the hover preview only on a genuine pointer move (see `armed`). */}
        <div onPointerMove={onPointerMove}>
          <Calendar
            mode="range"
            numberOfMonths={2}
            defaultMonth={parseIso(value.dateTo)}
            selected={selectedRange}
            onSelect={onSelect}
            onDayMouseEnter={onDayMouseEnter}
            disabled={{ after: parseIso(today) ?? new Date() }}
            locale={idLocale}
            classNames={{
              months: 'flex flex-col gap-4 sm:flex-row sm:justify-center sm:gap-8',
              month: 'flex flex-col items-center space-y-3',
              month_grid: 'border-collapse',
              weekdays: 'flex',
              week: 'flex mt-1',
              // Drop the base single-select fill so MIDDLE range days stay a light
              // band (the endpoints below own the solid fill).
              day_button:
                'inline-flex h-9 w-9 items-center justify-center rounded-base text-neutral-900 hover:bg-neutral-100',
              // Endpoints: solid green filled circle.
              range_start:
                '[&>button]:rounded-full [&>button]:bg-primary-700 [&>button]:text-white [&>button]:hover:bg-primary-700',
              range_end:
                '[&>button]:rounded-full [&>button]:bg-primary-700 [&>button]:text-white [&>button]:hover:bg-primary-700',
              // Days between endpoints: light band.
              range_middle:
                'aria-selected:bg-primary-50 aria-selected:text-primary-800 dark:aria-selected:text-primary-400',
              // Today always shows a green ring circle, even when unselected (the
              // number keeps its default colour; white when today is also selected).
              today:
                '[&>button]:rounded-full [&>button]:ring-1 [&>button]:ring-inset [&>button]:ring-primary-600',
            }}
          />
        </div>
        <div className="grid grid-cols-3 gap-1.5 border-t border-neutral-200 p-2 sm:grid-cols-5">
          {PRESET_ORDER.map((key) => (
            <Button
              key={key}
              size="sm"
              variant={activePreset === key ? 'primary' : 'outline'}
              onClick={() =>
                commit({ dateFrom: presets[key].dateFrom, dateTo: presets[key].dateTo })
              }
              className={cn(
                'whitespace-nowrap px-2',
                activePreset === key ? '' : 'text-neutral-600',
              )}
            >
              {t(key)}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
