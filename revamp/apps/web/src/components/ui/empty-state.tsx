import { type ReactNode } from 'react';

import { Illustration, type IllustrationName } from '@/components/illustrations/Illustration';
import { cn } from '@/lib/cn';

export interface EmptyStateProps {
  /** Illustration name from /public/illustrations (empty, no-results, …). */
  illustration?: IllustrationName;
  title: string;
  description?: ReactNode;
  /** Primary action (e.g. [Buat Baru] or [Coba Lagi]). */
  action?: ReactNode;
  className?: string;
  illustrationSize?: number;
}

/**
 * EmptyState (design-system §3 supporting primitive) — illustration-aware empty
 * / no-results / error panel. Used standalone and inside the DataTable states.
 */
export function EmptyState({
  illustration = 'empty',
  title,
  description,
  action,
  className,
  illustrationSize = 160,
}: EmptyStateProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-4 py-10 text-center',
        className,
      )}
    >
      <Illustration name={illustration} size={illustrationSize} />
      <div className="space-y-1">
        <p className="text-body font-semibold text-neutral-900">{title}</p>
        {description ? <p className="text-body-sm text-neutral-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
