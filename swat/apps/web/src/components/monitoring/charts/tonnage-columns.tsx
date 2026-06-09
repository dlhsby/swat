'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { type TonnagePoint } from '@/lib/monitoring-charts';

/** Daily tonnage columns (tonnes/day) — the "Volume per Hari" primary chart. */
export function TonnageColumns({ data }: { data: readonly TonnagePoint[] }): JSX.Element {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data as TonnagePoint[]} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-200)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: 'var(--neutral-500)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: 'var(--neutral-500)' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value: number) => [`${value} ton`, 'Tonase']}
          contentStyle={{
            background: 'var(--neutral-0)',
            border: '1px solid var(--neutral-200)',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="ton" fill="var(--primary-600)" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}
