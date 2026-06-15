import { Injectable } from '@nestjs/common';

import {
  type DailyTonnageRow,
  type MonthlyTonnageRow,
  type TonnageBySiteRow,
  type TonnageBySourceRow,
} from '../../monitoring/monitoring.types';

import { BaseReportBuilder, FMT_INT, FMT_KG, FMT_PCT } from './base-report.builder';

export interface TonnageReportData {
  dateFrom: string;
  dateTo: string;
  monthly: MonthlyTonnageRow[];
  daily: DailyTonnageRow[];
  bySource: TonnageBySourceRow[];
  bySite: TonnageBySiteRow[];
}

const TITLE = 'Laporan Tonase Pengangkutan Sampah';

/** Tonnage report — 5 sheets (summary, daily, by-source, top-TPS, statistics). */
@Injectable()
export class TonnageReportBuilder extends BaseReportBuilder {
  async build(data: TonnageReportData): Promise<Buffer> {
    const wb = this.newWorkbook();
    const period = this.formatPeriod(data.dateFrom, data.dateTo);
    const sourceTotal = data.bySource.reduce((s, r) => s + r.totalTonnageKg, 0) || 1;

    this.addSheet<MonthlyTonnageRow>(
      wb,
      'Ringkasan',
      TITLE,
      period,
      [
        { header: 'Bulan', key: 'month', width: 14 },
        { header: 'Total (kg)', key: 'totalTonnageKg', width: 18, numFmt: FMT_KG },
        { header: 'Jumlah Angkut', key: 'haulCount', width: 16, numFmt: FMT_INT },
      ],
      data.monthly,
      { totals: ['totalTonnageKg', 'haulCount'], freeze: true },
    );

    this.addSheet<DailyTonnageRow>(
      wb,
      'Harian',
      TITLE,
      period,
      [
        { header: 'Tanggal', key: 'date', width: 14, value: (r) => this.formatDate(r.date) },
        { header: 'Tonase (kg)', key: 'totalTonnageKg', width: 16, numFmt: FMT_KG },
        { header: 'Jumlah Angkut', key: 'haulCount', width: 16, numFmt: FMT_INT },
        {
          header: 'TPA Masuk (kg)',
          key: 'tpaInboundKg',
          width: 16,
          numFmt: FMT_KG,
          value: (r) => r.tpaInboundKg,
        },
        { header: 'Rekonsiliasi', key: 'reconciliationStatus', width: 16 },
      ],
      data.daily,
      { totals: ['totalTonnageKg', 'haulCount'], freeze: true },
    );

    this.addSheet<TonnageBySourceRow>(
      wb,
      'Per Sumber',
      TITLE,
      period,
      [
        { header: 'Kode', key: 'code', width: 10 },
        { header: 'Sumber Sampah', key: 'name', width: 24 },
        { header: 'Tonase (kg)', key: 'totalTonnageKg', width: 18, numFmt: FMT_KG },
        {
          header: '% Total',
          key: 'totalTonnageKg',
          width: 12,
          numFmt: FMT_PCT,
          value: (r) => r.totalTonnageKg / sourceTotal,
        },
        { header: 'Jumlah Angkut', key: 'haulCount', width: 16, numFmt: FMT_INT },
      ],
      [...data.bySource].sort((a, b) => b.totalTonnageKg - a.totalTonnageKg),
      { totals: ['totalTonnageKg', 'haulCount'] },
    );

    const topSites = [...data.bySite]
      .sort((a, b) => b.totalTonnageKg - a.totalTonnageKg)
      .slice(0, 20);
    this.addSheet<TonnageBySiteRow & { rank: number }>(
      wb,
      'Per TPS (Top 20)',
      TITLE,
      period,
      [
        { header: 'Peringkat', key: 'rank', width: 10, value: (r) => r.rank },
        { header: 'Lokasi', key: 'name', width: 28 },
        { header: 'Tipe', key: 'type', width: 10 },
        { header: 'Tonase (kg)', key: 'totalTonnageKg', width: 18, numFmt: FMT_KG },
        { header: 'Jumlah Angkut', key: 'haulCount', width: 16, numFmt: FMT_INT },
      ],
      topSites.map((r, i) => ({ ...r, rank: i + 1 })),
      { totals: ['totalTonnageKg', 'haulCount'] },
    );

    this.addStatisticsSheet(wb, TITLE, period, data.daily);
    return this.toBuffer(wb);
  }

  private addStatisticsSheet(
    wb: ReturnType<BaseReportBuilder['newWorkbook']>,
    title: string,
    period: string,
    daily: DailyTonnageRow[],
  ): void {
    const tonnages = daily.map((d) => d.totalTonnageKg);
    const total = tonnages.reduce((s, v) => s + v, 0);
    const max = daily.reduce<DailyTonnageRow | null>(
      (best, d) => (best && best.totalTonnageKg >= d.totalTonnageKg ? best : d),
      null,
    );
    const min = daily.reduce<DailyTonnageRow | null>(
      (worst, d) => (worst && worst.totalTonnageKg <= d.totalTonnageKg ? worst : d),
      null,
    );
    const stats = [
      { metric: 'Jumlah hari operasi', value: String(daily.length) },
      { metric: 'Total tonase (kg)', value: total.toLocaleString('id-ID') },
      {
        metric: 'Rata-rata per hari (kg)',
        value: daily.length ? Math.round(total / daily.length).toLocaleString('id-ID') : '0',
      },
      {
        metric: 'Hari tersibuk',
        value: max
          ? `${this.formatDate(max.date)} (${max.totalTonnageKg.toLocaleString('id-ID')} kg)`
          : '-',
      },
      {
        metric: 'Hari terendah',
        value: min
          ? `${this.formatDate(min.date)} (${min.totalTonnageKg.toLocaleString('id-ID')} kg)`
          : '-',
      },
    ];
    this.addSheet<{ metric: string; value: string }>(
      wb,
      'Statistik',
      title,
      period,
      [
        { header: 'Metrik', key: 'metric', width: 30 },
        { header: 'Nilai', key: 'value', width: 36 },
      ],
      stats,
    );
  }
}
