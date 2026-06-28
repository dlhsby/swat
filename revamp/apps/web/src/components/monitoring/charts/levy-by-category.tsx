'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { formatRupiah } from '@/lib/format';
import { type LevyCategoryBar } from '@/lib/monitoring-charts';

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

/** Levy total by category — the "Retribusi per Kategori" bar chart. */
export function LevyByCategory({ data }: { data: readonly LevyCategoryBar[] }): JSX.Element {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data as LevyCategoryBar[]} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-200)" vertical={false} />
        <XAxis
          dataKey="name"
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
          formatter={(value) => [formatRupiah(Number(value)), 'Retribusi']}
          contentStyle={{
            background: 'var(--neutral-0)',
            border: '1px solid var(--neutral-200)',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar
          dataKey="amount"
          fill="var(--primary-600)"
          radius={[4, 4, 0, 0]}
          maxBarSize={56}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
