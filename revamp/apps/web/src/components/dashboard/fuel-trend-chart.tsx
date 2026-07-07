'use client';

import { useTranslations } from 'next-intl';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { ChartCard } from '@/components/monitoring/chart-card';
import { Skeleton } from '@/components/ui';
import { useFuelTrend } from '@/hooks/use-monitoring';
import { formatFuel } from '@/lib/format';

import { BucketTabs, bucketLabel, useBucketTabs } from './bucket-tabs';

interface FuelPoint {
  readonly label: string;
  readonly requested: number;
  readonly approved: number;
}

/** Fuel requested vs approved over time (grouped bars) with harian/bulanan/tahunan tabs. */
export function FuelTrendChart({ dateKey }: { dateKey: string }): JSX.Element {
  const t = useTranslations('dashboard');
  const { bucket, setBucket, range } = useBucketTabs(dateKey);
  const query = useFuelTrend(range, bucket);

  const data: FuelPoint[] = (query.data ?? []).map((row) => ({
    label: bucketLabel(bucket, row.bucket),
    requested: row.requestedLiters,
    approved: row.approvedLiters,
  }));

  return (
    <ChartCard title={t('chartFuelTitle')} subtitle={t('chartFuelSub')}>
      <BucketTabs bucket={bucket} onBucket={setBucket} />
      {query.isLoading ? (
        <Skeleton className="h-[300px]" />
      ) : data.length === 0 ? (
        <p className="py-16 text-center text-body-sm text-neutral-500">{t('emptyChart')}</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-200)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--neutral-500)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'var(--neutral-500)' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value, name) => [formatFuel(Number(value)), name]}
              contentStyle={{
                background: 'var(--neutral-0)',
                border: '1px solid var(--neutral-200)',
                borderRadius: 6,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="requested"
              name={t('fuelRequested')}
              fill="var(--neutral-300)"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
            <Bar
              dataKey="approved"
              name={t('fuelApproved')}
              fill="var(--primary-600)"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
