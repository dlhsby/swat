import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import { type ComponentPropsWithoutRef, type ElementRef, forwardRef } from 'react';

import { cn } from '@/lib/cn';

/**
 * Checkbox (design-system §3.10) — 16×16, primary-700 when checked, supports
 * indeterminate (column "select all").
 */
export const Checkbox = forwardRef<
  ElementRef<typeof CheckboxPrimitive.Root>,
  ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(function Checkbox({ className, checked, ...props }, ref) {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      checked={checked}
      className={cn(
        'peer h-4 w-4 shrink-0 rounded-sm border border-neutral-300 bg-neutral-0 transition-colors disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary-700 data-[state=checked]:bg-primary-700 data-[state=checked]:text-white data-[state=indeterminate]:border-primary-700 data-[state=indeterminate]:bg-primary-700 data-[state=indeterminate]:text-white',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        {checked === 'indeterminate' ? (
          <Minus className="h-3 w-3" aria-hidden />
        ) : (
          <Check className="h-3 w-3" aria-hidden />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
});
