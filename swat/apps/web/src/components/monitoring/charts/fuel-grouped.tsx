'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { type FuelBar } from '@/lib/monitoring-charts';

/**
 * Grouped requested-vs-approved fuel bars per vehicle. Approved bars turn red
 * when the variance was flagged (under-approval beyond -5%), matching the hi-fi.
 */
export function FuelGrouped({ data }: { data: readonly FuelBar[] }): JSX.Element {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data as FuelBar[]} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-200)" vertical={false} />
        <XAxis
          dataKey="plate"
          tick={{ fontSize: 11, fill: 'var(--neutral-500)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: 'var(--neutral-500)' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value: number, name: string) => [`${value} L`, name]}
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
          name="Diminta"
          fill="var(--neutral-300)"
          radius={[4, 4, 0, 0]}
          isAnimationActive={false}
        />
        <Bar dataKey="approved" name="Disetujui" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {data.map((bar) => (
            <Cell key={bar.plate} fill={bar.flagged ? 'var(--danger-500)' : 'var(--primary-600)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
