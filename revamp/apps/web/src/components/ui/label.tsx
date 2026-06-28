import * as LabelPrimitive from '@radix-ui/react-label';
import { type ComponentPropsWithoutRef, type ElementRef, forwardRef } from 'react';

import { cn } from '@/lib/cn';

export interface LabelProps extends ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  /** Append a primary-700 asterisk after the label text. */
  required?: boolean;
}

/**
 * Label (design-system §3.9) — 500 weight, neutral-900, required asterisk in
 * primary-700. The clickable label for any control.
 */
export const Label = forwardRef<ElementRef<typeof LabelPrimitive.Root>, LabelProps>(function Label(
  { className, required, children, ...props },
  ref,
) {
  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        'text-label font-medium text-neutral-900 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
      {required ? (
        <span aria-hidden className="ml-0.5 text-primary-700">
          *
        </span>
      ) : null}
    </LabelPrimitive.Root>
  );
});
