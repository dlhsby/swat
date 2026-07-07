'use client';

import { useTranslations } from 'next-intl';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
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
import { type TimeBucket } from '@/lib/monitoring-api';
import { kgToTon } from '@/lib/monitoring-charts';

import { BucketTabs, bucketLabel, useBucketTabs } from './bucket-tabs';

interface StackPoint {
  readonly label: string;
  readonly gasifikasi: number;
  readonly landfill: number;
  readonly totalTon: number;
  /** % change of the total vs the previous bucket, or null for the first bucket. */
  readonly deltaPct: number | null;
}

/** i18n key for the "vs previous <period>" delta caption, per bucket. */
function prevKey(bucket: TimeBucket): 'vsPrevDay' | 'vsPrevMonth' | 'vsPrevYear' {
  return bucket === 'year' ? 'vsPrevYear' : bucket === 'month' ? 'vsPrevMonth' : 'vsPrevDay';
}

/** Signed `▲ 3,4%` / `▼ 1,2%`, coloured up=success / down=danger (codebase convention). */
function DeltaBadge({ pct, caption }: { pct: number; caption: string }): JSX.Element {
  const up = pct > 0;
  const flat = pct === 0;
  const cls = flat ? 'text-neutral-500' : up ? 'text-success-600' : 'text-danger-600';
  const arrow = flat ? '' : up ? '▲' : '▼';
  return (
    <span className={`text-body-sm font-medium tabular-nums ${cls}`}>
      {arrow} {Math.abs(pct).toLocaleString('id-ID', { maximumFractionDigits: 1 })}% {caption}
    </span>
  );
}

/**
 * Disposal tonnage over time as a stacked bar — landfill (base) + gasifikasi
 * (top) — with harian/bulanan/tahunan tabs. Shows the total per bucket (label on
 * top + in the tooltip) and the period-over-period delta (headline + per-bucket in
 * the tooltip). Gasifikasi is any disposal trip flagged GASIFICATION or whose notes
 * contain "GASIFIKASI" (resolved server-side).
 */
export function TonnageDestinationChart({ dateKey }: { dateKey: string }): JSX.Element {
  const t = useTranslations('dashboard');
  const { bucket, setBucket, range } = useBucketTabs(dateKey);
  const query = useTonnageDestination(range, bucket);
  const rows = query.data ?? [];

  const data: StackPoint[] = rows.map((row, i) => {
    const prevTotal = i > 0 ? rows[i - 1]!.totalKg : null;
    const deltaPct =
      prevTotal && prevTotal > 0 ? ((row.totalKg - prevTotal) / prevTotal) * 100 : null;
    return {
      label: bucketLabel(bucket, row.bucket),
      gasifikasi: kgToTon(row.gasificationKg),
      landfill: kgToTon(row.landfillKg),
      totalTon: kgToTon(row.totalKg),
      deltaPct,
    };
  });
  const latest = data.at(-1);
  const caption = t(prevKey(bucket));

  // Custom tooltip: landfill / gasifikasi / total + delta vs the previous bucket.
  function TonTooltip({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: ReadonlyArray<{ payload: StackPoint }>;
  }): JSX.Element | null {
    const p = payload?.[0]?.payload;
    if (!active || !p) return null;
    return (
      <div className="rounded-base border border-neutral-200 bg-neutral-0 px-3 py-2 text-tiny shadow-sm">
        <p className="mb-0.5 font-semibold text-neutral-900">{p.label}</p>
        <p className="tabular-nums text-primary-700">
          {t('destLandfill')}: {formatTonnage(p.landfill)}
        </p>
        <p className="tabular-nums text-warning-600">
          {t('destGasification')}: {formatTonnage(p.gasifikasi)}
        </p>
        <p className="tabular-nums font-medium text-neutral-900">
          {t('totalLabel')}: {formatTonnage(p.totalTon)}
        </p>
        {p.deltaPct !== null ? (
          <div className="mt-0.5">
            <DeltaBadge pct={p.deltaPct} caption={caption} />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <ChartCard
      title={t('chartTonnageTitle')}
      subtitle={t('chartTonnageSub')}
      right={
        latest ? (
          <div className="text-right">
            <p className="text-tiny text-neutral-500">{t('totalLabel')}</p>
            <p className="text-h3 font-semibold tabular-nums text-neutral-900">
              {formatTonnage(latest.totalTon)}
            </p>
            {latest.deltaPct !== null ? (
              <DeltaBadge pct={latest.deltaPct} caption={caption} />
            ) : null}
          </div>
        ) : undefined
      }
    >
      <BucketTabs bucket={bucket} onBucket={setBucket} />
      {query.isLoading ? (
        <Skeleton className="h-[300px]" />
      ) : data.length === 0 ? (
        <p className="py-16 text-center text-body-sm text-neutral-500">{t('emptyChart')}</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: -16 }}>
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
            <Tooltip cursor={{ fill: 'var(--neutral-100)' }} content={<TonTooltip />} />
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
            >
              {/* Total on top of each bar — only when few enough to read. */}
              {data.length <= 14 ? (
                <LabelList
                  dataKey="totalTon"
                  position="top"
                  className="fill-neutral-500"
                  fontSize={10}
                  formatter={(v) =>
                    Number(v ?? 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })
                  }
                />
              ) : null}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
