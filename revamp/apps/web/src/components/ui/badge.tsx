import { type HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';
import {
  getStatusPill,
  PILL_VARIANT_CLASSES,
  type PillDomain,
  type PillVariant,
} from '@/lib/status-pill';

const BASE = 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-tiny font-semibold';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** `solid` = status tint (default) · `outline` = bordered · `count` = neutral numeric. */
  appearance?: 'solid' | 'outline' | 'count';
  variant?: PillVariant;
  /** Render the leading colour dot (solid status pills). */
  dot?: boolean;
}

/**
 * Badge / Status Pill (design-system §3.17, §1.4). Always conveys meaning via
 * text + dot, never colour alone.
 */
export function Badge({
  className,
  appearance = 'solid',
  variant = 'slate',
  dot = false,
  children,
  ...props
}: BadgeProps): JSX.Element {
  const tokens = PILL_VARIANT_CLASSES[variant];
  return (
    <span
      className={cn(
        BASE,
        appearance === 'solid' && tokens.badge,
        appearance === 'outline' && `border ${tokens.badge} bg-transparent`,
        appearance === 'count' && 'bg-neutral-100 text-neutral-700',
        className,
      )}
      {...props}
    >
      {dot ? <span className={cn('h-1.5 w-1.5 rounded-full', tokens.dot)} aria-hidden /> : null}
      {children}
    </span>
  );
}

export interface StatusPillProps extends Omit<BadgeProps, 'variant' | 'children'> {
  domain: PillDomain;
  value: string;
}

/**
 * StatusPill — resolves a domain enum value to its Indonesian label + colour
 * via lib/status-pill and renders a dotted Badge.
 */
export function StatusPill({ domain, value, ...props }: StatusPillProps): JSX.Element {
  const { label, variant } = getStatusPill(domain, value);
  return (
    <Badge variant={variant} dot {...props}>
      {label}
    </Badge>
  );
}
