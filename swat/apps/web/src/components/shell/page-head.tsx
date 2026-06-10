import { type ReactNode } from 'react';

import { Breadcrumb, type BreadcrumbItem } from '@/components/ui';
import { cn } from '@/lib/cn';

export interface PageHeadProps {
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned action(s), e.g. a "Buat Baru" button. */
  actions?: ReactNode;
  breadcrumb?: BreadcrumbItem[];
  className?: string;
}

/** PageHead (hi-fi spec) — title + optional breadcrumb/description/actions row. */
export function PageHead({
  title,
  description,
  actions,
  breadcrumb,
  className,
}: PageHeadProps): JSX.Element {
  return (
    <div className={cn('mb-6', className)}>
      {breadcrumb ? <Breadcrumb items={breadcrumb} className="mb-2" /> : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-h1 font-bold text-neutral-900">{title}</h1>
          {description ? (
            <p className="mt-1.5 text-body-sm text-neutral-500">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
