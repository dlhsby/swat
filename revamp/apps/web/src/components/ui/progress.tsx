'use client';

import * as ProgressPrimitive from '@radix-ui/react-progress';
import { type ComponentPropsWithoutRef, type ElementRef, forwardRef } from 'react';

import { cn } from '@/lib/cn';

export interface ProgressProps extends ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  /** 0–100; omit for an indeterminate sweep. */
  value?: number | null;
}

/**
 * Progress (design-system §3.27) — determinate (upload %, quota usage) or
 * indeterminate. Pair with a text label for screen readers.
 */
export const Progress = forwardRef<ElementRef<typeof ProgressPrimitive.Root>, ProgressProps>(
  function Progress({ className, value, ...props }, ref) {
    const indeterminate = value === null || value === undefined;
    return (
      <ProgressPrimitive.Root
        ref={ref}
        value={indeterminate ? undefined : value}
        className={cn('relative h-2 w-full overflow-hidden rounded-full bg-neutral-200', className)}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            'h-full bg-primary-600 transition-all',
            indeterminate && 'w-1/3 animate-[indeterminate_1.2s_ease-in-out_infinite]',
          )}
          style={indeterminate ? undefined : { width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </ProgressPrimitive.Root>
    );
  },
);
