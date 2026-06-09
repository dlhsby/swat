import {
  type DailyTonnageRow,
  type FuelConsumptionRow,
  type TonnageBySourceRow,
} from './monitoring-api';

/**
 * Pure data-shaping for the monitoring charts. Keeps the React components thin
 * and lets the transforms be unit-tested. Colours mirror the hi-fi chart
 * prototype (designs/.../prototype_src/charts.jsx) as CSS custom properties so
 * the charts stay dark-mode safe.
 */

/** Emerald shades + one neutral, in donut/stack order (the prototype palette). */
export const SOURCE_COLORS = [
  'var(--primary-700)',
  'var(--primary-500)',
  'var(--primary-300)',
  'var(--neutral-300)',
] as const;

const ID_MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
] as const;

/** Kilograms → tonnes, rounded to two decimals. */
export function kgToTon(kg: number): number {
  return Math.round(kg / 10) / 100;
}

/** Short `d MMM` label for a `YYYY-MM-DD` date (UTC-anchored, Indonesian months). */
export function shortDateLabel(iso: string): string {
  const [, month, day] = iso.split('-').map(Number);
  return `${day} ${ID_MONTHS_SHORT[(month ?? 1) - 1]}`;
}

export interface TonnagePoint {
  readonly label: string;
  readonly date: string;
  readonly ton: number;
}

/** Daily tonnage rows → trend/column points (tonnes). */
export function tonnageTrend(daily: readonly DailyTonnageRow[]): TonnagePoint[] {
  return daily.map((row) => ({
    label: shortDateLabel(row.date),
    date: row.date,
    ton: kgToTon(row.totalTonnageKg),
  }));
}

export interface DonutSlice {
  readonly name: string;
  readonly ton: number;
  readonly color: string;
}

/**
 * Tonnage-by-source rows → donut slices (tonnes), keeping the top three sources
 * and folding any remainder into a neutral "Lainnya" slice so the palette never
 * runs out. Input is assumed sorted by tonnage desc (the API orders it so).
 */
export function sourceComposition(rows: readonly TonnageBySourceRow[]): {
  slices: DonutSlice[];
  totalTon: number;
} {
  const top = rows.slice(0, 3);
  const rest = rows.slice(3);
  const slices: DonutSlice[] = top.map((row, index) => ({
    name: row.name,
    ton: kgToTon(row.totalTonnageKg),
    color: SOURCE_COLORS[index]!,
  }));
  if (rest.length > 0) {
    const restKg = rest.reduce((sum, row) => sum + row.totalTonnageKg, 0);
    slices.push({ name: 'Lainnya', ton: kgToTon(restKg), color: SOURCE_COLORS[3]! });
  }
  const totalTon = slices.reduce((sum, slice) => sum + slice.ton, 0);
  return { slices, totalTon: Math.round(totalTon * 100) / 100 };
}

export interface FuelBar {
  readonly plate: string;
  readonly requested: number;
  readonly approved: number;
  readonly flagged: boolean;
}

/** Fuel rows → grouped requested/approved bars; `flagged` mirrors the RED variance. */
export function fuelBars(rows: readonly FuelConsumptionRow[]): FuelBar[] {
  return rows.map((row) => ({
    plate: row.plateNumber,
    requested: Math.round(row.fuelRequestedLiters * 100) / 100,
    approved: Math.round(row.fuelApprovedLiters * 100) / 100,
    flagged: row.flag === 'RED',
  }));
}

// ---------------------------------------------------------------------------
// Date-range presets — pure `YYYY-MM-DD` math (UTC-anchored) so the dashboards'
// quick filters are testable without a clock.
// ---------------------------------------------------------------------------

export type PresetKey = 'today' | 'last7' | 'thisMonth' | 'lastMonth' | 'ytd';

export interface DatePreset {
  readonly key: PresetKey;
  readonly dateFrom: string;
  readonly dateTo: string;
}

function toUtc(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}
function fmt(date: Date): string {
  return date.toISOString().slice(0, 10);
}
function addDays(iso: string, days: number): string {
  const date = toUtc(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return fmt(date);
}

/** The five quick-filter ranges relative to `today` (`YYYY-MM-DD`). */
export function datePresets(today: string): Record<PresetKey, DatePreset> {
  const now = toUtc(today);
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const monthStart = fmt(new Date(Date.UTC(year, month, 1)));
  const prevMonthStart = fmt(new Date(Date.UTC(year, month - 1, 1)));
  const prevMonthEnd = fmt(new Date(Date.UTC(year, month, 0)));
  return {
    today: { key: 'today', dateFrom: today, dateTo: today },
    last7: { key: 'last7', dateFrom: addDays(today, -6), dateTo: today },
    thisMonth: { key: 'thisMonth', dateFrom: monthStart, dateTo: today },
    lastMonth: { key: 'lastMonth', dateFrom: prevMonthStart, dateTo: prevMonthEnd },
    ytd: { key: 'ytd', dateFrom: fmt(new Date(Date.UTC(year, 0, 1))), dateTo: today },
  };
}
