import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type AlertVariant = 'success' | 'warning' | 'danger' | 'info';

const VARIANT: Record<
  AlertVariant,
  { container: string; icon: typeof Info; iconColor: string; role: 'status' | 'alert' }
> = {
  success: {
    container: 'border-success-500 bg-success-50',
    icon: CheckCircle2,
    iconColor: 'text-success-700',
    role: 'status',
  },
  warning: {
    container: 'border-warning-500 bg-warning-50',
    icon: AlertTriangle,
    iconColor: 'text-warning-700',
    role: 'alert',
  },
  danger: {
    container: 'border-danger-500 bg-danger-50',
    icon: XCircle,
    iconColor: 'text-danger-700',
    role: 'alert',
  },
  info: {
    container: 'border-info-500 bg-info-50',
    icon: Info,
    iconColor: 'text-info-700',
    role: 'status',
  },
};

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: AlertVariant;
  title?: ReactNode;
  /** Render a dismiss (✕) control. */
  onClose?: () => void;
}

/**
 * Alert banner (design-system §3.19) — in-page notice with border-left accent.
 * Inline field errors use FormField, not this.
 */
export function Alert({
  variant = 'info',
  title,
  onClose,
  className,
  children,
  ...props
}: AlertProps): JSX.Element {
  const spec = VARIANT[variant];
  const Glyph = spec.icon;
  return (
    <div
      role={spec.role}
      className={cn(
        'flex gap-3 rounded-base border-l-[3px] px-4 py-3 text-body-sm text-neutral-700',
        spec.container,
        className,
      )}
      {...props}
    >
      <Glyph className={cn('mt-0.5 h-5 w-5 shrink-0', spec.iconColor)} aria-hidden />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold text-neutral-900">{title}</p> : null}
        {children ? <div className={cn(title && 'mt-0.5')}>{children}</div> : null}
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="-mr-1 -mt-1 shrink-0 rounded-sm p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
