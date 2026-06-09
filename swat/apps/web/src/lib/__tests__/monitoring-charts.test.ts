import { describe, expect, it } from 'vitest';

import { type FuelConsumptionRow, type TonnageBySourceRow } from '../monitoring-api';
import {
  datePresets,
  fuelBars,
  kgToTon,
  shortDateLabel,
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
});

describe('tonnageTrend', () => {
  it('maps daily rows to labelled tonne points', () => {
    expect(
      tonnageTrend([
        {
          date: '2026-06-01',
          totalTonnageKg: 4000,
          haulCount: 3,
          tpaInboundKg: null,
          reconciliationStatus: 'PENDING',
        },
      ]),
    ).toEqual([{ label: '1 Jun', date: '2026-06-01', ton: 4 }]);
  });
});

describe('sourceComposition', () => {
  const row = (name: string, kg: number): TonnageBySourceRow => ({
    wasteSourceId: 1,
    code: name[0]!,
    name,
    totalTonnageKg: kg,
    haulCount: 1,
  });

  it('keeps the top three sources and folds the rest into Lainnya', () => {
    const { slices, totalTon } = sourceComposition([
      row('Dinas', 4000),
      row('Pasar', 3000),
      row('Rekanan', 2000),
      row('Pintu Air', 1000),
      row('Pelabuhan', 500),
    ]);
    expect(slices.map((s) => s.name)).toEqual(['Dinas', 'Pasar', 'Rekanan', 'Lainnya']);
    expect(slices[3]!.ton).toBe(1.5); // 1000 + 500 kg
    expect(totalTon).toBe(10.5);
  });

  it('omits Lainnya when there are three or fewer sources', () => {
    const { slices } = sourceComposition([row('Dinas', 4000), row('Pasar', 3000)]);
    expect(slices).toHaveLength(2);
  });
});

describe('fuelBars', () => {
  it('maps fuel rows and surfaces the RED flag', () => {
    const rows: FuelConsumptionRow[] = [
      {
        vehicleId: 1,
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
