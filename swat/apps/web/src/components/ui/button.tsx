import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { type ButtonHTMLAttributes, forwardRef } from 'react';

import { Spinner } from './spinner';

import { cn } from '@/lib/cn';

/**
 * Button — primary action trigger (design-system §3.1).
 * Variants/sizes/states map 1:1 to the token spec; one primary per view region.
 */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-base font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary-700 text-white hover:bg-primary-800 active:bg-primary-900',
        secondary: 'border border-neutral-200 bg-neutral-100 text-neutral-900 hover:bg-neutral-200',
        outline: 'border border-neutral-300 text-neutral-700 hover:bg-neutral-50',
        ghost: 'text-primary-700 hover:bg-primary-50',
        destructive: 'bg-danger-600 text-white hover:bg-danger-700',
        link: 'text-primary-700 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 rounded-sm px-3 text-body-sm',
        md: 'h-10 px-4 text-body',
        lg: 'h-11 px-5 text-body',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** Render the child element as the button (Radix Slot) for links etc. */
  asChild?: boolean;
  /** Show a leading spinner and mark the control non-interactive. */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild = false, loading = false, disabled, children, ...props },
  ref,
) {
  // Slot can only host a single child, so loading state is button-only.
  const Comp = asChild ? Slot : 'button';
  const isDisabled = disabled ?? loading;
  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={asChild ? undefined : isDisabled}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? <Spinner aria-label="Memuat" /> : null}
          {children}
        </>
      )}
    </Comp>
  );
});
