'use client';

import { Clock } from 'lucide-react';
import { forwardRef, useRef, useState } from 'react';

import { cn } from '@/lib/cn';

import { Button } from './button';
import { Input, type InputProps } from './input';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from './popover';

const PRESETS = ['08:00', '12:00', '16:00'] as const;

// 24-hour options laid out as tap-friendly grids (no inner scroll — a portalled
// scroll area inside a Dialog/Sheet is blocked by the scroll-lock). Hours 00–23;
// minutes in 5-minute steps (any minute is still reachable by typing).
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

export interface TimePickerProps extends Omit<
  InputProps,
  'type' | 'trailing' | 'leading' | 'onChange' | 'value'
> {
  value?: string;
  onValueChange?: (value: string) => void;
  /** Render quick presets (Sekarang / 08:00 / 12:00 / 16:00). */
  presets?: boolean;
}

/** Two-digit zero-pad for HH:mm. */
function nowHHmm(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
 * field (any minute) or pick from the clock dropdown (hours + 5-min steps). Not a
 * native `<input type="time">`, whose AM/PM-vs-24h display follows the OS locale
 * and ignores `lang`. WIB.
 */
export const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(function TimePicker(
  { className, value, onValueChange, presets = true, onBlur, disabled, ...props },
  ref,
) {
  const [open, setOpen] = useState(false);
  // The masked input is the popover Anchor, so opening on focus keeps focus on it
  // — outside the Content. Without guarding the dismiss events, Radix treats that
  // as a focus/interaction outside and closes immediately (the "blink").
  const anchorRef = useRef<HTMLDivElement>(null);
  const insideAnchor = (target: EventTarget | null): boolean =>
    target instanceof Node && (anchorRef.current?.contains(target) ?? false);
  const current = normalize(value ?? '');
  const curHour = current.slice(0, 2);
  const curMinute = current.slice(3, 5);

  const setHour = (h: string): void => onValueChange?.(`${h}:${curMinute || '00'}`);
  const setMinute = (m: string): void => onValueChange?.(`${curHour || '00'}:${m}`);

  const grid = (
    items: readonly string[],
    selected: string,
    onPick: (v: string) => void,
    label: string,
  ): JSX.Element => (
    <div role="group" aria-label={label}>
      <p className="pb-1.5 text-tiny font-semibold text-neutral-500">{label}</p>
      <div className="grid grid-cols-6 gap-1">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            role="option"
            aria-selected={item === selected}
            onClick={() => onPick(item)}
            className={cn(
              'rounded-base px-1 py-1.5 text-center text-body-sm tabular-nums hover:bg-neutral-100',
              item === selected
                ? 'bg-primary-700 font-semibold text-white hover:bg-primary-700'
                : 'text-neutral-700',
            )}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
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
          className="w-[min(18rem,calc(100vw-2rem))] space-y-3 p-3"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onFocusOutside={(e) => {
            if (insideAnchor(e.target)) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (insideAnchor(e.target)) e.preventDefault();
          }}
        >
          {grid(HOURS, curHour, setHour, 'Jam')}
          {grid(MINUTES, curMinute, setMinute, 'Menit')}
        </PopoverContent>
      </Popover>
      {presets ? (
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onValueChange?.(nowHHmm(new Date()))}
          >
            Sekarang
          </Button>
          {PRESETS.map((p) => (
            <Button
              key={p}
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => onValueChange?.(p)}
            >
              {p}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
});
