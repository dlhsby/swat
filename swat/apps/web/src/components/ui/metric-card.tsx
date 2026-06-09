import { type ComponentType } from 'react';

import { Card, CardContent } from './card';
import { Skeleton } from './skeleton';

export interface MetricCardProps {
  /** Lucide (or compatible) icon rendered in the tinted chip. */
  readonly icon: ComponentType<{ className?: string }>;
  /** Short metric label (e.g. "Total Tonase"). */
  readonly label: string;
  /** Pre-formatted primary value (e.g. "1.234"). */
  readonly value: string;
  /** Unit suffix shown next to the value (e.g. "ton"). */
  readonly unit: string;
  /** When true, renders a skeleton in place of the value. */
  readonly loading?: boolean;
}

/**
 * Single KPI tile: tinted icon chip, label, and a large tabular value with unit.
 * Shared across the dashboard and the Phase-2 monitoring dashboards so every
 * metric reads identically (design-system §3, hi-fi KPI grid).
 */
export function MetricCard({
  icon: Icon,
  label,
  value,
  unit,
  loading = false,
}: MetricCardProps): JSX.Element {
  return (
    <Card>
      <CardContent className="space-y-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-base bg-primary-50 text-primary-700">
          <Icon className="h-5 w-5" />
        </span>
        <p className="text-label text-neutral-500">{label}</p>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="text-h1 font-bold tabular-nums text-neutral-900">
            {value} <span className="text-body-sm font-medium text-neutral-400">{unit}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
