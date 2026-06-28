import {
  type DailyTonnageRow,
  type FuelConsumptionRow,
  type LevySummaryRow,
  type LevyTrendRow,
  type MonthlyTonnageRow,
  type TonnageBySourceRow,
} from './monitoring-api';

/**
 * Pure data-shaping for the monitoring charts. Keeps the React components thin
 * and lets the transforms be unit-tested. Colours mirror the hi-fi chart
 * prototype (designs/.../prototype_src/charts.jsx) as CSS custom properties so
 * the charts stay dark-mode safe.
 */

/**
 * Categorical palette for the by-source donut: distinct hues (not shades) so each
 * waste source is easy to tell apart. The LAST colour is reserved for the folded
 * "Lainnya" slice; the ones before it colour the top sources in order.
 */
export const SOURCE_COLORS = [
  'var(--primary-600)', // emerald
  'var(--info-500)', // blue
  'var(--warning-500)', // amber
  'var(--danger-500)', // red
  'var(--neutral-300)', // grey — "Lainnya"
] as const;

/** Named sources shown before the rest fold into "Lainnya" (last colour). */
const SOURCE_TOP_N = SOURCE_COLORS.length - 1;

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

/** Short `MMM YY` label for a `YYYY-MM` month (Indonesian months). */
export function shortMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  return `${ID_MONTHS_SHORT[(month ?? 1) - 1]} ${String(year ?? '').slice(2)}`;
}

export interface LevyCategoryBar {
  readonly name: string;
  readonly amount: number;
}

/** Levy-by-category rows → bar data (integer IDR), preserving the API's desc order. */
export function levyByCategory(rows: readonly LevySummaryRow[]): LevyCategoryBar[] {
  return rows.map((row) => ({ name: row.categoryName, amount: row.totalAmount }));
}

export interface LevyTrendPoint {
  readonly label: string;
  readonly month: string;
  readonly amount: number;
}

/** Monthly levy rows → trend points (integer IDR), oldest first. */
export function levyTrendPoints(rows: readonly LevyTrendRow[]): LevyTrendPoint[] {
  return rows.map((row) => ({
    label: shortMonthLabel(row.month),
    month: row.month,
    amount: row.totalAmount,
  }));
}

export interface TonnagePoint {
  readonly label: string;
  readonly date: string;
  readonly ton: number;
  /** Change in tonnes vs the previous point (null for the first point). */
  readonly deltaTon: number | null;
  /** Percent change vs the previous point (null when there's no usable baseline). */
  readonly deltaPct: number | null;
}

/** Attach period-over-period deltas (vs the previous point) to a tonne series. */
function withDeltas(
  points: ReadonlyArray<{ label: string; date: string; ton: number }>,
): TonnagePoint[] {
  return points.map((point, index) => {
    const prev = index > 0 ? points[index - 1]!.ton : null;
    const deltaTon = prev === null ? null : Math.round((point.ton - prev) * 100) / 100;
    const deltaPct =
      prev === null || prev === 0 ? null : Math.round(((point.ton - prev) / prev) * 1000) / 10;
    return { ...point, deltaTon, deltaPct };
  });
}

/** Daily tonnage rows → trend/column points (tonnes) with day-over-day deltas. */
export function tonnageTrend(daily: readonly DailyTonnageRow[]): TonnagePoint[] {
  return withDeltas(
    daily.map((row) => ({
      label: shortDateLabel(row.date),
      date: row.date,
      ton: kgToTon(row.totalTonnageKg),
    })),
  );
}

/** Monthly tonnage rows → trend/column points (tonnes) with month-over-month deltas. */
export function monthlyTonnageTrend(rows: readonly MonthlyTonnageRow[]): TonnagePoint[] {
  return withDeltas(
    rows.map((row) => ({
      label: shortMonthLabel(row.month),
      date: row.month,
      ton: kgToTon(row.totalTonnageKg),
    })),
  );
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
  const top = rows.slice(0, SOURCE_TOP_N);
  const rest = rows.slice(SOURCE_TOP_N);
  const slices: DonutSlice[] = top.map((row, index) => ({
    name: row.name,
    ton: kgToTon(row.totalTonnageKg),
    color: SOURCE_COLORS[index]!,
  }));
  if (rest.length > 0) {
    const restKg = rest.reduce((sum, row) => sum + row.totalTonnageKg, 0);
    slices.push({ name: 'Lainnya', ton: kgToTon(restKg), color: SOURCE_COLORS[SOURCE_TOP_N]! });
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

export type PresetKey =
  | 'today'
  | 'prevDay'
  | 'last7'
  | 'thisMonth'
  | 'lastMonth'
  | 'last1m'
  | 'last3m'
  | 'last6m'
  | 'ytd'
  | 'last1y';

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

/** The quick-filter ranges relative to `today` (`YYYY-MM-DD`). */
export function datePresets(today: string): Record<PresetKey, DatePreset> {
  const now = toUtc(today);
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();
  const monthStart = fmt(new Date(Date.UTC(year, month, 1)));
  const prevMonthStart = fmt(new Date(Date.UTC(year, month - 1, 1)));
  const prevMonthEnd = fmt(new Date(Date.UTC(year, month, 0)));
  // `months` ago, clamping the day to the target month's length so a 31st (or
  // Feb 29) never rolls forward into the next month (e.g. Mar 31 − 1m → Feb 28).
  const back = (months: number): string => {
    const target = month - months;
    const lastDay = new Date(Date.UTC(year, target + 1, 0)).getUTCDate();
    return fmt(new Date(Date.UTC(year, target, Math.min(day, lastDay))));
  };
  return {
    today: { key: 'today', dateFrom: today, dateTo: today },
    prevDay: { key: 'prevDay', dateFrom: addDays(today, -1), dateTo: addDays(today, -1) },
    last7: { key: 'last7', dateFrom: addDays(today, -6), dateTo: today },
    thisMonth: { key: 'thisMonth', dateFrom: monthStart, dateTo: today },
    lastMonth: { key: 'lastMonth', dateFrom: prevMonthStart, dateTo: prevMonthEnd },
    last1m: { key: 'last1m', dateFrom: back(1), dateTo: today },
    last3m: { key: 'last3m', dateFrom: back(3), dateTo: today },
    last6m: { key: 'last6m', dateFrom: back(6), dateTo: today },
    ytd: { key: 'ytd', dateFrom: fmt(new Date(Date.UTC(year, 0, 1))), dateTo: today },
    last1y: { key: 'last1y', dateFrom: back(12), dateTo: today },
  };
}
