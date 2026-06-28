import { type HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

/**
 * Skeleton (design-system §3 supporting primitives) — shimmer loading bar.
 * Decorative; mark the container `aria-busy` and hide skeletons from SR.
 */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-base bg-neutral-200', className)}
      {...props}
    />
  );
}
