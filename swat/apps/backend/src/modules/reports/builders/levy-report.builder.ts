import { Injectable } from '@nestjs/common';

import {
  type LevyByCategoryMonthRow,
  type LevySummaryRow,
  type LevyTrendRow,
} from '../../monitoring/monitoring.types';

import { BaseReportBuilder, FMT_IDR, FMT_INT, type ReportColumn } from './base-report.builder';

export interface LevyReportData {
  dateFrom: string;
  dateTo: string;
  summary: LevySummaryRow[];
  trend: LevyTrendRow[];
  byCategoryMonth: LevyByCategoryMonthRow[];
}

type PivotRow = Record<string, string | number>;

const TITLE = 'Laporan Retribusi';

/** Levy report — per-category summary + monthly trend. */
@Injectable()
export class LevyReportBuilder extends BaseReportBuilder {
  async build(data: LevyReportData): Promise<Buffer> {
    const wb = this.newWorkbook();
    const period = this.formatPeriod(data.dateFrom, data.dateTo);

    this.addSheet<LevySummaryRow>(
      wb,
      'Ringkasan per Kategori',
      TITLE,
      period,
      [
        { header: 'Kategori', key: 'categoryName', width: 28 },
        { header: 'Jumlah (Rp)', key: 'totalAmount', width: 20, numFmt: FMT_IDR },
        { header: 'Transaksi', key: 'transactionCount', width: 14, numFmt: FMT_INT },
        { header: 'Rata-rata (Rp)', key: 'avgPerTransaction', width: 20, numFmt: FMT_IDR },
      ],
      [...data.summary].sort((a, b) => b.totalAmount - a.totalAmount),
      { totals: ['totalAmount', 'transactionCount'] },
    );

    this.addSheet<LevyTrendRow>(
      wb,
      'Tren Bulanan',
      TITLE,
      period,
      [
        { header: 'Bulan', key: 'month', width: 16 },
        { header: 'Jumlah (Rp)', key: 'totalAmount', width: 20, numFmt: FMT_IDR },
      ],
      data.trend,
      { totals: ['totalAmount'], freeze: true },
    );

    this.addPivotSheet(wb, TITLE, period, data.byCategoryMonth);

    return this.toBuffer(wb);
  }

  /** Category × month pivot: a row per category with a YTD total and one column
   * per month in range. Months are derived from the data so the sheet adapts to
   * the requested window. */
  private addPivotSheet(
    wb: ReturnType<BaseReportBuilder['newWorkbook']>,
    title: string,
    period: string,
    byCategoryMonth: LevyByCategoryMonthRow[],
  ): void {
    const months = [...new Set(byCategoryMonth.map((r) => r.month))].sort();
    const byCategory = new Map<string, Record<string, number>>();
    for (const r of byCategoryMonth) {
      const entry = byCategory.get(r.categoryName) ?? {};
      entry[r.month] = r.totalAmount;
      byCategory.set(r.categoryName, entry);
    }
    const rows: PivotRow[] = [...byCategory.entries()].map(([categoryName, perMonth]) => {
      const ytd = months.reduce((sum, m) => sum + (perMonth[m] ?? 0), 0);
      const row: PivotRow = { categoryName, ytd };
      for (const m of months) {
        row[m] = perMonth[m] ?? 0;
      }
      return row;
    });

    const columns: ReportColumn<PivotRow>[] = [
      { header: 'Kategori', key: 'categoryName', width: 24 },
      { header: 'YTD (Rp)', key: 'ytd', width: 18, numFmt: FMT_IDR },
      ...months.map(
        (m): ReportColumn<PivotRow> => ({ header: m, key: m, width: 14, numFmt: FMT_IDR }),
      ),
    ];

    this.addSheet<PivotRow>(wb, 'Per Kategori (Bulanan)', title, period, columns, rows, {
      totals: ['ytd', ...months],
      freeze: true,
    });
  }
}
