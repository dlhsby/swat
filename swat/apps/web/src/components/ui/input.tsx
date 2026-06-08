import { type InputHTMLAttributes, forwardRef, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Marks the field invalid: red border + danger ring, sets aria-invalid. */
  error?: boolean;
  /** Leading adornment (icon). Rendered in neutral-500. */
  leading?: ReactNode;
  /** Trailing adornment (icon or unit suffix km/kg/L). Rendered in neutral-500. */
  trailing?: ReactNode;
}

const base =
  'h-10 w-full rounded-base border bg-neutral-0 px-3 py-2.5 text-body text-neutral-900 transition-[border-color,color] placeholder:text-neutral-400 hover:border-neutral-300 focus:border-primary-600 focus:outline-none disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400';

/**
 * Input — text/email/number/tel (design-system §3.2). Always paired with a real
 * <label>; placeholder is example-only. Supports leading/trailing slots.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error, leading, trailing, ...props },
  ref,
) {
  const field = (
    <input
      ref={ref}
      aria-invalid={error || undefined}
      className={cn(
        base,
        error && 'border-danger-500 focus:border-danger-500',
        leading && 'pl-9',
        trailing && 'pr-9',
        className,
      )}
      {...props}
    />
  );

  if (!leading && !trailing) {
    return field;
  }

  return (
    <div className="relative">
      {leading ? (
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-500">
          {leading}
        </span>
      ) : null}
      {field}
      {trailing ? (
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-500">
          {trailing}
        </span>
      ) : null}
    </div>
  );
});
