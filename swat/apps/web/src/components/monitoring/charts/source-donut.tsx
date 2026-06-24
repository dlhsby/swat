'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { formatTonnage } from '@/lib/format';
import { type DonutSlice } from '@/lib/monitoring-charts';

/** Source-composition donut (tonnes by waste source) for the tonnage dashboard. */
export function SourceDonut({ slices }: { slices: readonly DonutSlice[] }): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <div className="mx-auto w-full max-w-[220px]">
        <ResponsiveContainer width="100%" height={190}>
          <PieChart>
            <Pie
              data={slices as DonutSlice[]}
              dataKey="ton"
              nameKey="name"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {slices.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [formatTonnage(Number(value)), name]}
              contentStyle={{
                background: 'var(--neutral-0)',
                border: '1px solid var(--neutral-200)',
                borderRadius: 6,
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full space-y-1.5">
        {slices.map((slice) => (
          <li key={slice.name} className="flex items-center gap-2 text-body-sm text-neutral-600">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: slice.color }} />
            <span className="min-w-0 flex-1 truncate">{slice.name}</span>
            <span className="shrink-0 whitespace-nowrap font-medium tabular-nums text-neutral-900">
              {formatTonnage(slice.ton)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
