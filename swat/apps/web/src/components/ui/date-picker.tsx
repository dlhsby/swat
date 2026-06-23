'use client';

import { format, isValid, parse } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { forwardRef, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/cn';

import { Calendar } from './calendar';
import { Input } from './input';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from './popover';

export interface DatePickerProps {
  /** Controlled value as an ISO date string (yyyy-MM-dd) or undefined. */
  value?: string;
  onValueChange?: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  /** Disallow any date after today (calendar greys them out; typed dates revert). */
  disableFuture?: boolean;
  /** Form-control wiring (id + aria) forwarded onto the input. */
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

/** ISO yyyy-MM-dd ⇄ Date, anchored to local midnight (display only). */
function parseIso(value?: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

/** Mask typed digits into `dd/MM/yyyy` (separators auto-inserted). */
function maskDate(raw: string): string {
  const x = raw.replace(/\D/g, '').slice(0, 8);
  let s = x.slice(0, 2);
  if (x.length > 2) s += `/${x.slice(2, 4)}`;
  if (x.length > 4) s += `/${x.slice(4, 8)}`;
  return s;
}

/** Parse a typed `dd/MM/yyyy` into ISO `yyyy-MM-dd`, or null if unrecognized. */
function parseInput(text: string): string | null {
  const s = text.trim();
  if (!s) return null;
  for (const fmt of ['dd/MM/yyyy', 'd/M/yyyy']) {
    const d = parse(s, fmt, new Date());
    if (isValid(d)) return format(d, 'yyyy-MM-dd');
  }
  return null;
}

function toDisplay(value?: string): string {
  const d = parseIso(value);
  return d ? format(d, 'dd/MM/yyyy', { locale: id }) : '';
}

/**
 * DatePicker (design-system §3.6) — editable masked field (type dd/MM/yyyy) plus
 * a calendar popover. Stored ISO yyyy-MM-dd. Garbage input reverts on blur.
 */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
  {
    value,
    onValueChange,
    placeholder = 'dd/mm/yyyy',
    disabled,
    error,
    className,
    disableFuture,
    id: controlId,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
  },
  ref,
) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(toDisplay(value));
  const [focused, setFocused] = useState(false);
  const selected = parseIso(value);
  const todayIso = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!focused) setText(toDisplay(value));
  }, [value, focused]);

  const anchorRef = useRef<HTMLDivElement>(null);
  const insideAnchor = (target: EventTarget | null): boolean =>
    target instanceof Node && (anchorRef.current?.contains(target) ?? false);

  const commit = (): void => {
    const s = text.trim();
    if (!s) {
      onValueChange?.(undefined);
      return;
    }
    const parsed = parseInput(s);
    if (parsed && !(disableFuture && parsed > todayIso)) onValueChange?.(parsed);
    else setText(toDisplay(value));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div ref={anchorRef} className="relative">
          <Input
            ref={ref}
            id={controlId}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder={placeholder}
            disabled={disabled}
            error={error}
            aria-describedby={ariaDescribedBy}
            aria-invalid={error || ariaInvalid || undefined}
            value={text}
            onFocus={() => {
              setFocused(true);
              setOpen(true);
            }}
            onChange={(e) => setText(maskDate(e.target.value))}
            onBlur={() => {
              setFocused(false);
              commit();
            }}
            className={cn('pr-9', className)}
          />
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              aria-label="Pilih tanggal"
              className="absolute inset-y-0 right-0 flex items-center px-3 text-neutral-500 hover:text-neutral-700 disabled:cursor-not-allowed disabled:text-neutral-300"
            >
              <CalendarIcon className="h-4 w-4" aria-hidden />
            </button>
          </PopoverTrigger>
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-auto p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onFocusOutside={(e) => {
          if (insideAnchor(e.target)) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (insideAnchor(e.target)) e.preventDefault();
        }}
      >
        <Calendar
          mode="single"
          defaultMonth={selected}
          selected={selected}
          disabled={disableFuture ? { after: new Date() } : undefined}
          onSelect={(d) => {
            onValueChange?.(d ? format(d, 'yyyy-MM-dd') : undefined);
            setOpen(false);
          }}
          locale={id}
        />
        <div className="border-t border-neutral-200 p-1.5">
          <button
            type="button"
            onClick={() => {
              onValueChange?.(todayIso);
              setOpen(false);
            }}
            className="w-full rounded-base px-2 py-1.5 text-body-sm font-medium text-primary-700 hover:bg-primary-50"
          >
            Hari ini
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
});
