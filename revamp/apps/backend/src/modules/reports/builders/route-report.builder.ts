import { Injectable } from '@nestjs/common';

import { type RouteActivityRow } from '../../monitoring/monitoring.types';

import { BaseReportBuilder, FMT_INT } from './base-report.builder';

export interface RouteReportData {
  dateFrom: string;
  dateTo: string;
  routes: RouteActivityRow[];
}

const TITLE = 'Laporan Aktivitas Rute';

/** Route report — frequency (sorted DESC) + activity aggregated by category. */
@Injectable()
export class RouteReportBuilder extends BaseReportBuilder {
  async build(data: RouteReportData): Promise<Buffer> {
    const wb = this.newWorkbook();
    const period = this.formatPeriod(data.dateFrom, data.dateTo);

    const sorted = [...data.routes].sort((a, b) => b.tripCount - a.tripCount);
    this.addSheet<RouteActivityRow & { rank: number }>(
      wb,
      'Frekuensi',
      TITLE,
      period,
      [
        { header: 'Peringkat', key: 'rank', width: 10, value: (r) => r.rank },
        {
          header: 'Rute',
          key: 'routeId',
          width: 40,
          value: (r) => `${r.originSiteName} → ${r.destinationSiteName}`,
        },
        { header: 'Kategori', key: 'category', width: 16 },
        { header: 'Jarak (km)', key: 'distanceKm', width: 12, numFmt: FMT_INT },
        { header: 'Frekuensi', key: 'tripCount', width: 12, numFmt: FMT_INT },
      ],
      sorted.map((r, i) => ({ ...r, rank: i + 1 })),
      { totals: ['tripCount'], freeze: true },
    );

    const byCategory = new Map<string, number>();
    for (const r of data.routes) {
      byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + r.tripCount);
    }
    const categoryRows = [...byCategory.entries()]
      .map(([category, tripCount]) => ({ category, tripCount }))
      .sort((a, b) => b.tripCount - a.tripCount);
    this.addSheet<{ category: string; tripCount: number }>(
      wb,
      'Per Kategori',
      TITLE,
      period,
      [
        { header: 'Kategori', key: 'category', width: 20 },
        { header: 'Frekuensi', key: 'tripCount', width: 14, numFmt: FMT_INT },
      ],
      categoryRows,
      { totals: ['tripCount'] },
    );

    return this.toBuffer(wb);
  }
}
