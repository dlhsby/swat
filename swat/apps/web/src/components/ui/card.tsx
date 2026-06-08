import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

const cardVariants = cva('rounded-lg border border-neutral-200 bg-neutral-0 text-neutral-900', {
  variants: {
    variant: {
      default: '',
      clickable: 'cursor-pointer transition-shadow hover:shadow-sm',
      outlined: 'shadow-none',
      elevated: 'shadow-base',
    },
  },
  defaultVariants: { variant: 'default' },
});

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

/** Card (design-system §3.16) — surface for form sections, metrics, haul rows. */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant, ...props },
  ref,
) {
  return <div ref={ref} className={cn(cardVariants({ variant }), className)} {...props} />;
});

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardHeader({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-between gap-2 px-lg pt-lg', className)}
        {...props}
      />
    );
  },
);

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  function CardTitle({ className, ...props }, ref) {
    return <h3 ref={ref} className={cn('text-h3 text-neutral-900', className)} {...props} />;
  },
);

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(function CardDescription({ className, ...props }, ref) {
  return <p ref={ref} className={cn('text-body-sm text-neutral-500', className)} {...props} />;
});

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardContent({ className, ...props }, ref) {
    return <div ref={ref} className={cn('p-lg', className)} {...props} />;
  },
);

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function CardFooter({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn('flex items-center gap-2 px-lg pb-lg pt-0', className)}
        {...props}
      />
    );
  },
);
