'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { type DonutSlice } from '@/lib/monitoring-charts';

/** Source-composition donut (tonnes by waste source) for the tonnage dashboard. */
export function SourceDonut({ slices }: { slices: readonly DonutSlice[] }): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={slices as DonutSlice[]}
            dataKey="ton"
            nameKey="name"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            stroke="none"
          >
            {slices.map((slice) => (
              <Cell key={slice.name} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [`${value} ton`, name]}
            contentStyle={{
              background: 'var(--neutral-0)',
              border: '1px solid var(--neutral-200)',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <ul className="space-y-1.5">
        {slices.map((slice) => (
          <li key={slice.name} className="flex items-center gap-2 text-body-sm text-neutral-600">
            <span className="h-3 w-3 rounded-sm" style={{ background: slice.color }} />
            {slice.name}
            <span className="font-medium tabular-nums text-neutral-900">{slice.ton} ton</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
