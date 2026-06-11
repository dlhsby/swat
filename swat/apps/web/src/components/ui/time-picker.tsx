import { forwardRef } from 'react';

import { cn } from '@/lib/cn';

import { Button } from './button';
import { Input, type InputProps } from './input';

const PRESETS = ['08:00', '12:00', '16:00'] as const;

export interface TimePickerProps extends Omit<
  InputProps,
  'type' | 'trailing' | 'onChange' | 'value'
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

/** Clamp to a valid 24-hour HH:mm on blur (hours 0–23, minutes 0–59). */
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
 * TimePicker (design-system §3.7) — always 24-hour HH:mm. Implemented as a masked
 * text field (not a native `<input type="time">`, whose AM/PM vs 24h display follows
 * the OS/browser locale and ignores the `lang` attribute). WIB.
 */
export const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(function TimePicker(
  { className, value, onValueChange, presets = true, onBlur, ...props },
  ref,
) {
  return (
    <div className="space-y-2">
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        placeholder="HH:mm"
        maxLength={5}
        autoComplete="off"
        value={value}
        onChange={(e) => onValueChange?.(formatLive(e.target.value))}
        onBlur={(e) => {
          onValueChange?.(normalize(e.target.value));
          onBlur?.(e);
        }}
        className={cn('tnum', className)}
        {...props}
      />
      {presets ? (
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
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
