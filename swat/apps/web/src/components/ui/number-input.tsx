import { Minus, Plus } from 'lucide-react';
import { forwardRef, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { Input, type InputProps } from './input';

export interface NumberInputProps extends Omit<InputProps, 'type' | 'leading'> {
  /** Show ± stepper buttons (icon-sm). Off by default — keyboard entry. */
  steppers?: boolean;
  /** Unit suffix (kg/km/L) shown in the trailing slot. */
  unit?: ReactNode;
  /** Called with the parsed numeric value when steppers fire. */
  onValueChange?: (value: number) => void;
}

/**
 * NumberInput (design-system §3.8) — tabular figures, optional ± stepper,
 * unit suffix slot. min/max/step enforced via the native input.
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  { className, steppers = false, unit, value, min, max, step = 1, onValueChange, ...props },
  ref,
) {
  const clamp = (n: number): number => {
    const lo = min === undefined ? -Infinity : Number(min);
    const hi = max === undefined ? Infinity : Number(max);
    return Math.min(hi, Math.max(lo, n));
  };

  const bump = (dir: 1 | -1): void => {
    const current = Number(value ?? 0);
    const next = clamp(current + dir * Number(step));
    onValueChange?.(next);
  };

  if (!steppers) {
    return (
      <Input
        ref={ref}
        type="number"
        inputMode="decimal"
        value={value}
        min={min}
        max={max}
        step={step}
        trailing={unit}
        className={cn('tnum', className)}
        {...props}
      />
    );
  }

  return (
    <div className="flex items-stretch">
      <button
        type="button"
        aria-label="Kurangi"
        onClick={() => bump(-1)}
        disabled={props.disabled}
        className="flex h-10 w-10 items-center justify-center rounded-l-base border border-r-0 border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Minus className="h-4 w-4" aria-hidden />
      </button>
      <Input
        ref={ref}
        type="number"
        inputMode="decimal"
        value={value}
        min={min}
        max={max}
        step={step}
        trailing={unit}
        className={cn('rounded-none text-center tnum', className)}
        {...props}
      />
      <button
        type="button"
        aria-label="Tambah"
        onClick={() => bump(1)}
        disabled={props.disabled}
        className="flex h-10 w-10 items-center justify-center rounded-r-base border border-l-0 border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
});
