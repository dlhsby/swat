import { describe, expect, it } from 'vitest';

import {
  type DailyTonnageRow,
  type FuelConsumptionRow,
  type LevySummaryRow,
  type LevyTrendRow,
  type TonnageBySourceRow,
} from '../monitoring-api';
import {
  datePresets,
  fuelBars,
  kgToTon,
  levyByCategory,
  levyTrendPoints,
  shortDateLabel,
  shortMonthLabel,
  sourceComposition,
  tonnageTrend,
} from '../monitoring-charts';

describe('kgToTon / shortDateLabel', () => {
  it('converts kilograms to tonnes (2dp)', () => {
    expect(kgToTon(45250)).toBe(45.25);
    expect(kgToTon(0)).toBe(0);
  });

  it('renders a short Indonesian date label', () => {
    expect(shortDateLabel('2026-06-08')).toBe('8 Jun');
    expect(shortDateLabel('2026-01-15')).toBe('15 Jan');
  });

  it('renders a short Indonesian month label', () => {
    expect(shortMonthLabel('2026-06')).toBe('Jun 26');
    expect(shortMonthLabel('2025-12')).toBe('Des 25');
  });
});

describe('levyByCategory / levyTrendPoints', () => {
  it('maps category summary rows to bars, preserving order and amount', () => {
    const rows: LevySummaryRow[] = [
      {
        categoryName: 'Komersial',
        totalAmount: 28_000_000,
        transactionCount: 11,
        avgPerTransaction: 2_545_454,
      },
      {
        categoryName: 'Rumah Tangga',
        totalAmount: 15_000_000,
        transactionCount: 12,
        avgPerTransaction: 1_250_000,
      },
    ];
    expect(levyByCategory(rows)).toEqual([
      { name: 'Komersial', amount: 28_000_000 },
      { name: 'Rumah Tangga', amount: 15_000_000 },
    ]);
  });

  it('maps monthly trend rows to labelled points', () => {
    const rows: LevyTrendRow[] = [
      { month: '2026-05', totalAmount: 4_000_000 },
      { month: '2026-06', totalAmount: 6_000_000 },
    ];
    expect(levyTrendPoints(rows)).toEqual([
      { label: 'Mei 26', month: '2026-05', amount: 4_000_000 },
      { label: 'Jun 26', month: '2026-06', amount: 6_000_000 },
    ]);
  });
});

describe('tonnageTrend', () => {
  const dailyRow = (date: string, kg: number): DailyTonnageRow => ({
    date,
    totalTonnageKg: kg,
    haulCount: 3,
    tpaInboundKg: null,
    reconciliationStatus: 'PENDING',
  });

  it('maps daily rows to labelled tonne points (first point has no delta)', () => {
    expect(tonnageTrend([dailyRow('2026-06-01', 4000)])).toEqual([
      { label: '1 Jun', date: '2026-06-01', ton: 4, deltaTon: null, deltaPct: null },
    ]);
  });

  it('computes day-over-day deltas in tonnes and percent', () => {
    const points = tonnageTrend([dailyRow('2026-06-01', 4000), dailyRow('2026-06-02', 5000)]);
    expect(points[1]).toEqual({
      label: '2 Jun',
      date: '2026-06-02',
      ton: 5,
      deltaTon: 1,
      deltaPct: 25,
    });
  });
});

describe('sourceComposition', () => {
  const row = (name: string, kg: number): TonnageBySourceRow => ({
    wasteSourceId: 'ws-1',
    code: name[0]!,
    name,
    totalTonnageKg: kg,
    haulCount: 1,
  });

  it('keeps the top four sources and folds the rest into Lainnya', () => {
    const { slices, totalTon } = sourceComposition([
      row('Dinas', 4000),
      row('Pasar', 3000),
      row('Rekanan', 2000),
      row('Pintu Air', 1000),
      row('Pelabuhan', 500),
      row('Swasta', 500),
    ]);
    expect(slices.map((s) => s.name)).toEqual([
      'Dinas',
      'Pasar',
      'Rekanan',
      'Pintu Air',
      'Lainnya',
    ]);
    expect(slices[4]!.ton).toBe(1); // 500 + 500 kg folded
    expect(totalTon).toBe(11);
  });

  it('omits Lainnya when there are four or fewer sources', () => {
    const { slices } = sourceComposition([row('Dinas', 4000), row('Pasar', 3000)]);
    expect(slices).toHaveLength(2);
  });
});

describe('fuelBars', () => {
  it('maps fuel rows and surfaces the RED flag', () => {
    const rows: FuelConsumptionRow[] = [
      {
        vehicleId: 'veh-1',
        plateNumber: 'L 1 AB',
        fuelApprovedLiters: 80,
        fuelRequestedLiters: 100,
        variancePercent: -20,
        flag: 'RED',
      },
    ];
    expect(fuelBars(rows)).toEqual([
      { plate: 'L 1 AB', requested: 100, approved: 80, flagged: true },
    ]);
  });
});

describe('datePresets', () => {
  it('builds the five ranges relative to a reference day', () => {
    const presets = datePresets('2026-06-08');
    expect(presets.today).toMatchObject({ dateFrom: '2026-06-08', dateTo: '2026-06-08' });
    expect(presets.last7).toMatchObject({ dateFrom: '2026-06-02', dateTo: '2026-06-08' });
    expect(presets.thisMonth).toMatchObject({ dateFrom: '2026-06-01', dateTo: '2026-06-08' });
    expect(presets.lastMonth).toMatchObject({ dateFrom: '2026-05-01', dateTo: '2026-05-31' });
    expect(presets.ytd).toMatchObject({ dateFrom: '2026-01-01', dateTo: '2026-06-08' });
  });

  it('handles a January reference (previous month crosses the year)', () => {
    const presets = datePresets('2026-01-10');
    expect(presets.lastMonth).toMatchObject({ dateFrom: '2025-12-01', dateTo: '2025-12-31' });
  });
});
