import { type SVGProps } from 'react';

import { cn } from '@/lib/cn';

/**
 * Indeterminate loading spinner used by Button (loading), Dropzone, and any
 * async control. Decorative by default; pass an `aria-label` to announce it.
 */
export function Spinner({ className, ...props }: SVGProps<SVGSVGElement>): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-hidden={props['aria-label'] ? undefined : true}
      className={cn('h-4 w-4 animate-spin text-current', className)}
      {...props}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
