'use client';

import { Clock } from 'lucide-react';
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/cn';

import { Input, type InputProps } from './input';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from './popover';

/** Time options at a fixed step (default 15 min), e.g. 00:00 … 23:45. */
const STEP_MIN = 15;
export const TIME_OPTIONS: readonly string[] = Array.from(
  { length: (24 * 60) / STEP_MIN },
  (_, i) => {
    const total = i * STEP_MIN;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  },
);

/**
 * Scrollable list of times (the dropdown body shared by TimePicker and
 * DateTimePicker). The selected row scrolls into view on mount. Any minute is
 * still reachable by typing in the host's masked input.
 */
export function TimeList({
  value,
  onSelect,
  className,
}: {
  value: string;
  onSelect: (time: string) => void;
  className?: string;
}): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  // The current time, snapped to the nearest step below (for the "now" marker).
  const nowSlot = useMemo(() => {
    const d = new Date();
    const m = Math.floor(d.getMinutes() / STEP_MIN) * STEP_MIN;
    return `${String(d.getHours()).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }, []);
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'center' });
  }, []);
  // Radix Dialog/Sheet scroll-lock blocks native wheel scroll on this portalled
  // popover. Drive the scroll manually on a non-passive listener (preventDefault
  // also avoids double-speed scrolling on the page, where native still works).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      el.scrollTop += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  return (
    <div
      ref={containerRef}
      className={cn('overflow-y-auto overscroll-contain py-2', className)}
      role="listbox"
      aria-label="Pilih waktu"
    >
      {TIME_OPTIONS.map((t) => (
        <button
          key={t}
          ref={t === value ? selectedRef : undefined}
          type="button"
          role="option"
          aria-selected={t === value}
          onClick={() => onSelect(t)}
          className={cn(
            'block w-full px-3 py-1.5 text-left text-body-sm tabular-nums hover:bg-neutral-100',
            t === value
              ? 'bg-primary-700 font-semibold text-white hover:bg-primary-700'
              : t === nowSlot
                ? 'text-primary-700' // quiet "now" marker; use the "Sekarang" shortcut to jump
                : 'text-neutral-700',
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

export interface TimePickerProps extends Omit<
  InputProps,
  'type' | 'trailing' | 'leading' | 'onChange' | 'value'
> {
  value?: string;
  onValueChange?: (value: string) => void;
  /** Retained for API compatibility; the dropdown is now a scrollable list. */
  presets?: boolean;
}

/** Pack typed digits into `HH:mm` as the user types (colon auto-inserted). */
function formatLive(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/** Clamp to a valid 24-hour HH:mm (hours 0–23, minutes 0–59); '' stays ''. */
function normalize(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (!digits) {
    return '';
  }
  const hh = Math.min(23, Number(digits.slice(0, 2).padEnd(2, '0')));
  const minutePart = digits.slice(2);
  const mm = minutePart ? Math.min(59, Number(minutePart.padEnd(2, '0'))) : 0;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * TimePicker (design-system §3.7) — always 24-hour HH:mm. Type into the masked
 * field (any minute) or pick from the scrollable time list (15-min steps). Not a
 * native `<input type="time">`, whose AM/PM-vs-24h display follows the OS locale.
 * WIB.
 */
export const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(function TimePicker(
  { className, value, onValueChange, presets: _presets, onBlur, disabled, ...props },
  ref,
) {
  const [open, setOpen] = useState(false);
  // The masked input is the popover Anchor, so opening on focus keeps focus on it
  // — outside the Content. Guard the dismiss events so Radix doesn't insta-close.
  const anchorRef = useRef<HTMLDivElement>(null);
  const insideAnchor = (target: EventTarget | null): boolean =>
    target instanceof Node && (anchorRef.current?.contains(target) ?? false);
  const current = normalize(value ?? '');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div ref={anchorRef} className="relative">
          <Input
            ref={ref}
            type="text"
            inputMode="numeric"
            placeholder="HH:mm"
            maxLength={5}
            autoComplete="off"
            disabled={disabled}
            value={value}
            onFocus={() => setOpen(true)}
            onChange={(e) => onValueChange?.(formatLive(e.target.value))}
            onBlur={(e) => {
              onValueChange?.(normalize(e.target.value));
              onBlur?.(e);
            }}
            className={cn('tnum pr-9', className)}
            {...props}
          />
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              aria-label="Pilih jam"
              className="absolute inset-y-0 right-0 flex items-center px-3 text-neutral-500 hover:text-neutral-700 disabled:cursor-not-allowed disabled:text-neutral-300"
            >
              <Clock className="h-4 w-4" aria-hidden />
            </button>
          </PopoverTrigger>
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-32 p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onFocusOutside={(e) => {
          if (insideAnchor(e.target)) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (insideAnchor(e.target)) e.preventDefault();
        }}
      >
        <TimeList
          className="max-h-60"
          value={current}
          onSelect={(t) => {
            onValueChange?.(t);
            setOpen(false);
          }}
        />
        <div className="border-t border-neutral-200 p-1.5">
          <button
            type="button"
            onClick={() => {
              const d = new Date();
              onValueChange?.(
                `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
              );
              setOpen(false);
            }}
            className="w-full rounded-base px-2 py-1.5 text-body-sm font-medium text-primary-700 hover:bg-primary-50"
          >
            Sekarang
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
});
