'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { formatTonnage } from '@/lib/format';
import { type TonnagePoint } from '@/lib/monitoring-charts';

/** `+12,5 ton` / `−5 ton` — signed tonnage delta (id-ID). */
function signedTon(delta: number): string {
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '';
  return `${sign}${formatTonnage(Math.abs(delta))}`;
}

/** `+3,4%` / `−1,2%` — signed percent delta (id-ID). */
function signedPct(pct: number): string {
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : '';
  return `${sign}${Math.abs(pct).toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`;
}

/**
 * Tooltip showing the period's tonnage plus its change vs the previous period
 * (number + percentage), coloured up/down. Drives both the daily ("per Hari")
 * and monthly ("Tren Bulanan") charts, so the delta is day- or month-over-period.
 */
function DeltaTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: TonnagePoint }>;
}): JSX.Element | null {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  const { deltaTon, deltaPct } = point;
  return (
    <div className="rounded-base border border-neutral-200 bg-neutral-0 px-3 py-2 text-tiny shadow-sm">
      <p className="font-semibold text-neutral-900">{point.label}</p>
      <p className="tabular-nums text-neutral-700">{formatTonnage(point.ton)}</p>
      {deltaTon !== null ? (
        <p className={`tabular-nums ${deltaTon >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
          {deltaTon >= 0 ? '▲' : '▼'} {signedTon(deltaTon)}
          {deltaPct !== null ? ` (${signedPct(deltaPct)})` : ''}
        </p>
      ) : null}
    </div>
  );
}

/** Tonnage columns (tonnes/period) — the "Volume per Hari" + monthly-trend charts. */
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
        <Tooltip cursor={{ fill: 'var(--neutral-100)' }} content={<DeltaTooltip />} />
        <Bar
          dataKey="ton"
          fill="var(--primary-600)"
          radius={[4, 4, 0, 0]}
          maxBarSize={48}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
