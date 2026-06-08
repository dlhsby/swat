'use client';

import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/cn';

import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface DatePickerProps {
  /** Controlled value as an ISO date string (yyyy-MM-dd) or undefined. */
  value?: string;
  onValueChange?: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

/** ISO yyyy-MM-dd ⇄ Date, anchored to local midnight (display only). */
function parseIso(value?: string): Date | undefined {
  if (!value) return undefined;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

/**
 * DatePicker (design-system §3.6) — display & entry dd/MM/yyyy, stored ISO.
 * Trigger = Input + calendar icon; Indonesian calendar.
 */
export function DatePicker({
  value,
  onValueChange,
  placeholder = 'dd/mm/yyyy',
  disabled,
  error,
  className,
}: DatePickerProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const selected = parseIso(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        disabled={disabled}
        aria-invalid={error || undefined}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-base border bg-neutral-0 px-3 py-2.5 text-body text-neutral-900 transition-[border-color,color] hover:border-neutral-300 focus:border-primary-600 focus:outline-none disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400',
          error && 'border-danger-500 focus:border-danger-500',
          !selected && 'text-neutral-400',
          className,
        )}
      >
        <span>{selected ? format(selected, 'dd/MM/yyyy', { locale: id }) : placeholder}</span>
        <CalendarIcon className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          defaultMonth={selected}
          selected={selected}
          onSelect={(date) => {
            onValueChange?.(date ? format(date, 'yyyy-MM-dd') : undefined);
            setOpen(false);
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
