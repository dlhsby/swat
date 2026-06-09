import { type ReactNode } from 'react';

import { Card, CardContent } from '@/components/ui';

/** Titled surface for a chart or table on the monitoring dashboards (hi-fi §3). */
export function ChartCard({
  title,
  subtitle,
  right,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}): JSX.Element {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-h3 font-semibold text-neutral-900">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-body-sm text-neutral-500">{subtitle}</p> : null}
          </div>
          {right}
        </div>
        {children}
        {footer}
      </CardContent>
    </Card>
  );
}
