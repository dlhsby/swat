'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatRupiah } from '@/lib/format';
import { type LevyTrendPoint } from '@/lib/monitoring-charts';

/** Compact `Rp…jt` / `Rp…M` axis tick for large IDR amounts. */
function rupiahTick(value: number): string {
  if (value >= 1_000_000_000) {
    return `Rp${Math.round(value / 100_000_000) / 10}M`;
  }
  if (value >= 1_000_000) {
    return `Rp${Math.round(value / 1_000_000)}jt`;
  }
  return `Rp${value}`;
}

/** Levy total per month — the "Tren Retribusi" area chart. */
export function LevyTrend({ data }: { data: readonly LevyTrendPoint[] }): JSX.Element {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data as LevyTrendPoint[]} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id="levyTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary-500)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--primary-500)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-200)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: 'var(--neutral-500)' }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={rupiahTick}
          tick={{ fontSize: 12, fill: 'var(--neutral-500)' }}
          tickLine={false}
          axisLine={false}
          width={56}
        />
        <Tooltip
          formatter={(value: number) => [formatRupiah(value), 'Retribusi']}
          contentStyle={{
            background: 'var(--neutral-0)',
            border: '1px solid var(--neutral-200)',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="var(--primary-600)"
          strokeWidth={2}
          fill="url(#levyTrendFill)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
