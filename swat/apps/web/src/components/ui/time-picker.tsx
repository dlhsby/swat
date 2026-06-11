import { Clock } from 'lucide-react';
import { forwardRef } from 'react';

import { cn } from '@/lib/cn';

import { Button } from './button';
import { Input, type InputProps } from './input';

const PRESETS = ['08:00', '12:00', '16:00'] as const;

export interface TimePickerProps extends Omit<InputProps, 'type' | 'trailing' | 'onChange'> {
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

/**
 * TimePicker (design-system §3.7) — 24-hour HH:mm masked entry (native time
 * input) + clock icon + quick presets. WIB.
 */
export const TimePicker = forwardRef<HTMLInputElement, TimePickerProps>(function TimePicker(
  { className, value, onValueChange, presets = true, ...props },
  ref,
) {
  return (
    <div className="space-y-2">
      <Input
        ref={ref}
        type="time"
        // Force 24-hour HH:mm entry regardless of the OS locale: the native time
        // input picks AM/PM vs 24h from the element's `lang`, so pin it to id-ID
        // (Indonesian uses 24-hour clock) instead of inheriting en-US (12h + AM/PM).
        lang="id-ID"
        value={value}
        trailing={<Clock className="h-4 w-4" aria-hidden />}
        onChange={(e) => onValueChange?.(e.target.value)}
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
