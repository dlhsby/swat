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
import { useTonnageDestination } from '@/hooks/use-monitoring';
import { formatTonnage } from '@/lib/format';
import { kgToTon } from '@/lib/monitoring-charts';

import { BucketTabs, bucketLabel, useBucketTabs } from './bucket-tabs';

interface StackPoint {
  readonly label: string;
  readonly gasifikasi: number;
  readonly landfill: number;
}

/**
 * Disposal tonnage over time as a stacked bar — landfill (base) + gasifikasi
 * (top) — with harian/bulanan/tahunan tabs. Gasifikasi is any disposal trip
 * flagged GASIFICATION or whose notes contain "GASIFIKASI" (resolved server-side).
 */
export function TonnageDestinationChart({ dateKey }: { dateKey: string }): JSX.Element {
  const t = useTranslations('dashboard');
  const { bucket, setBucket, range } = useBucketTabs(dateKey);
  const query = useTonnageDestination(range, bucket);

  const data: StackPoint[] = (query.data ?? []).map((row) => ({
    label: bucketLabel(bucket, row.bucket),
    gasifikasi: kgToTon(row.gasificationKg),
    landfill: kgToTon(row.landfillKg),
  }));

  return (
    <ChartCard title={t('chartTonnageTitle')} subtitle={t('chartTonnageSub')}>
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
              formatter={(value, name) => [formatTonnage(Number(value)), name]}
              contentStyle={{
                background: 'var(--neutral-0)',
                border: '1px solid var(--neutral-200)',
                borderRadius: 6,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="landfill"
              stackId="ton"
              name={t('destLandfill')}
              fill="var(--primary-600)"
              isAnimationActive={false}
            />
            <Bar
              dataKey="gasifikasi"
              stackId="ton"
              name={t('destGasification')}
              fill="var(--warning-500)"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
