import { Minus, Plus } from 'lucide-react';
import { type ChangeEvent, type FocusEvent, forwardRef, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

import { Input, type InputProps } from './input';

export interface NumberInputProps extends Omit<InputProps, 'type' | 'leading'> {
  /** Show ± stepper buttons (icon-sm). Off by default — keyboard entry. */
  steppers?: boolean;
  /** Unit suffix (kg/km/L) shown in the trailing slot. */
  unit?: ReactNode;
  /**
   * Called with the parsed, clamped numeric value on BOTH typing and stepper
   * clicks — so wiring `value` + `onValueChange` (e.g. a RHF `Controller`'s
   * `field.value` / `field.onChange`) drives the control from a single handler.
   * The native `onChange` still fires too, for `register()`-style usage.
   */
  onValueChange?: (value: number) => void;
}

/**
 * NumberInput (design-system §3.8) — tabular figures, optional ± stepper,
 * unit suffix slot. min/max/step enforced via the native input.
 */
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  {
    className,
    steppers = false,
    unit,
    value,
    min,
    max,
    step = 1,
    onValueChange,
    onChange,
    onFocus,
    ...props
  },
  ref,
) {
  const clamp = (n: number): number => {
    const lo = min === undefined ? -Infinity : Number(min);
    const hi = max === undefined ? Infinity : Number(max);
    return Math.min(hi, Math.max(lo, n));
  };

  const bump = (dir: 1 | -1): void => {
    const current = Number(value ?? 0);
    onValueChange?.(clamp(current + dir * Number(step)));
  };

  // Forward the raw event (for register/onChange consumers) and, when the field
  // holds a valid number, surface the parsed value via onValueChange. Do NOT
  // clamp while typing: clamping each keystroke makes high-min fields (e.g. a
  // year with min 1900) un-typeable — "2" would snap to 1900 before "2024" is
  // finished. Bounds are enforced by the stepper and by schema validation.
  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onChange?.(event);
    const next = event.target.valueAsNumber;
    if (!Number.isNaN(next)) {
      onValueChange?.(next);
    }
  };

  // Select a default-0 (or empty) on focus so the first keystroke replaces it
  // instead of producing "05" — the user shouldn't have to delete the 0.
  const handleFocus = (event: FocusEvent<HTMLInputElement>): void => {
    onFocus?.(event);
    if (event.currentTarget.value === '' || Number(event.currentTarget.value) === 0) {
      event.currentTarget.select();
    }
  };

  const field = (
    <Input
      ref={ref}
      type="number"
      inputMode="decimal"
      value={value}
      min={min}
      max={max}
      step={step}
      trailing={unit}
      onChange={handleChange}
      onFocus={handleFocus}
      className={cn('tnum', steppers && 'rounded-none text-center', className)}
      {...props}
    />
  );

  if (!steppers) {
    return field;
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
      {field}
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
