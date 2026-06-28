import { forwardRef, type TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

/**
 * Textarea (design-system §3.3) — same border/focus/error tokens as Input,
 * min-height ≈3 rows, vertical resize. Used for "Catatan".
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, error, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={error || undefined}
      className={cn(
        'min-h-[88px] w-full resize-y rounded-base border bg-neutral-0 px-3 py-2.5 text-body leading-normal text-neutral-900 transition-[border-color,color] placeholder:text-neutral-400 hover:border-neutral-300 focus:border-primary-600 focus:outline-none disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400',
        error && 'border-danger-500 focus:border-danger-500',
        className,
      )}
      {...props}
    />
  );
});
