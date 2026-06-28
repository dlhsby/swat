import { type ReactNode } from 'react';

import { cn } from '@/lib/cn';

export interface DescriptionItem {
  term: string;
  value: ReactNode;
  /** Render the value with tabular-nums (weights, odometer, money). */
  numeric?: boolean;
  /** Render the value in mono (codes / plate numbers). */
  mono?: boolean;
}

export interface DescriptionListProps {
  items: DescriptionItem[];
  className?: string;
}

/**
 * Description List (design-system §3.28) — read-only key→value detail, the
 * canonical Checker verification summary counterpart to the Form Field.
 */
export function DescriptionList({ items, className }: DescriptionListProps): JSX.Element {
  return (
    <dl className={cn('divide-y divide-neutral-100', className)}>
      {items.map((item) => (
        <div key={item.term} className="grid grid-cols-2 gap-2 py-2.5 first:pt-0 last:pb-0">
          <dt className="text-body-sm text-neutral-500">{item.term}</dt>
          <dd
            className={cn(
              'text-right text-body-sm font-medium text-neutral-900',
              item.numeric && 'tnum',
              item.mono && 'mono',
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
