import { Workbook } from 'exceljs';

import { FuelReportBuilder } from '../fuel-report.builder';
import { LevyReportBuilder } from '../levy-report.builder';
import { RouteReportBuilder } from '../route-report.builder';
import { TonnageReportBuilder } from '../tonnage-report.builder';

async function load(buffer: Buffer): Promise<Workbook> {
  const wb = new Workbook();
  // ExcelJS's load() param type predates @types/node's generic Buffer; cast to
  // its declared parameter type to bridge the harmless variance mismatch.
  await wb.xlsx.load(buffer as unknown as Parameters<Workbook['xlsx']['load']>[0]);
  return wb;
}

describe('TonnageReportBuilder', () => {
  it('produces a 5-sheet branded workbook with SUM-formula totals (not hardcoded)', async () => {
    const buffer = await new TonnageReportBuilder().build({
      dateFrom: '2026-01-01',
      dateTo: '2026-02-28',
      monthly: [
        { month: '2026-01', totalTonnageKg: 1000, haulCount: 10 },
        { month: '2026-02', totalTonnageKg: 2000, haulCount: 20 },
      ],
      daily: [
        {
          date: '2026-01-01',
          totalTonnageKg: 500,
          haulCount: 5,
          tpaInboundKg: 480,
          reconciliationStatus: 'MATCHED',
        },
      ],
      bySource: [
        { wasteSourceId: 's1', code: 'D', name: 'Dinas', totalTonnageKg: 1200, haulCount: 12 },
        { wasteSourceId: 's2', code: 'S', name: 'Swasta', totalTonnageKg: 800, haulCount: 8 },
      ],
      bySite: [{ siteId: 't1', name: 'TPS A', type: 'TPS', totalTonnageKg: 900, haulCount: 9 }],
    });

    const wb = await load(buffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      'Ringkasan',
      'Harian',
      'Per Sumber',
      'Per TPS (Top 20)',
      'Statistik',
    ]);

    const ringkasan = wb.getWorksheet('Ringkasan')!;
    // Brand block on row 1.
    expect(String(ringkasan.getCell(1, 1).value)).toContain('Dinas Lingkungan Hidup');
    // Data cell carries the input value.
    expect(ringkasan.getCell(6, 2).value).toBe(1000);
    // Totals row uses a live SUM formula, not a precomputed constant.
    const totalCell = ringkasan.getCell(8, 2);
    expect(totalCell.formula).toMatch(/^SUM\(/);
  });
});

describe('FuelReportBuilder', () => {
  it('builds summary + by-vehicle + by-type + variance sheets', async () => {
    const buffer = await new FuelReportBuilder().build({
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
      consumption: [
        {
          vehicleId: 'v1',
          plateNumber: 'L 1 AB',
          fuelApprovedLiters: 40,
          fuelRequestedLiters: 50,
          variancePercent: -20,
          flag: 'RED',
        },
      ],
      byType: [
        { fuelId: 'f1', fuelName: 'Solar', totalApprovedLiters: 40, totalRequestedLiters: 50 },
      ],
    });
    const wb = await load(buffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      'Ringkasan',
      'Per Kendaraan',
      'Per Jenis BBM',
      'Analisis Varian',
    ]);
    // The RED vehicle appears in the variance sheet.
    expect(wb.getWorksheet('Analisis Varian')!.getCell(6, 1).value).toBe('L 1 AB');
  });
});

describe('RouteReportBuilder', () => {
  it('sorts frequency DESC and totals trip counts with a formula', async () => {
    const buffer = await new RouteReportBuilder().build({
      dateFrom: '2026-01-01',
      dateTo: '2026-01-31',
      routes: [
        {
          routeId: 'r1',
          category: 'DISPOSAL',
          originSiteName: 'TPS A',
          destinationSiteName: 'TPA X',
          distanceKm: 10,
          tripCount: 5,
        },
        {
          routeId: 'r2',
          category: 'PICKUP',
          originSiteName: 'TPS B',
          destinationSiteName: 'TPS C',
          distanceKm: 4,
          tripCount: 20,
        },
      ],
    });
    const wb = await load(buffer);
    const freq = wb.getWorksheet('Frekuensi')!;
    // Highest tripCount ranked first.
    expect(freq.getCell(6, 5).value).toBe(20);
    expect(freq.getCell(8, 5).formula).toMatch(/^SUM\(/);
  });
});

describe('LevyReportBuilder', () => {
  it('builds category summary + monthly trend with IDR totals', async () => {
    const buffer = await new LevyReportBuilder().build({
      dateFrom: '2026-01-01',
      dateTo: '2026-02-28',
      summary: [
        {
          categoryName: 'Rumah Tangga',
          totalAmount: 15000000,
          transactionCount: 3,
          avgPerTransaction: 5000000,
        },
      ],
      trend: [
        { month: '2026-01', totalAmount: 7000000 },
        { month: '2026-02', totalAmount: 8000000 },
      ],
      byCategoryMonth: [
        { categoryName: 'Rumah Tangga', month: '2026-01', totalAmount: 7000000 },
        { categoryName: 'Rumah Tangga', month: '2026-02', totalAmount: 8000000 },
      ],
    });
    const wb = await load(buffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      'Ringkasan per Kategori',
      'Tren Bulanan',
      'Per Kategori (Bulanan)',
    ]);
    expect(wb.getWorksheet('Tren Bulanan')!.getCell(7, 2).value).toBe(8000000);
    // Pivot: YTD column sums the months for the category.
    expect(wb.getWorksheet('Per Kategori (Bulanan)')!.getCell(6, 2).value).toBe(15000000);
  });
});
