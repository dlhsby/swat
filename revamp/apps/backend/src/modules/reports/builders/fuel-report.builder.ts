import { Injectable } from '@nestjs/common';

import { type FuelByTypeRow, type FuelConsumptionRow } from '../../monitoring/monitoring.types';

import { BaseReportBuilder, FMT_LITER, FMT_PCT } from './base-report.builder';

export interface FuelReportData {
  dateFrom: string;
  dateTo: string;
  consumption: FuelConsumptionRow[];
  byType: FuelByTypeRow[];
}

const TITLE = 'Laporan Konsumsi Bahan Bakar';

/** Fuel report — summary KPIs, by-vehicle, by-type, and a variance-analysis sheet. */
@Injectable()
export class FuelReportBuilder extends BaseReportBuilder {
  async build(data: FuelReportData): Promise<Buffer> {
    const wb = this.newWorkbook();
    const period = this.formatPeriod(data.dateFrom, data.dateTo);

    const approved = data.consumption.reduce((s, r) => s + r.fuelApprovedLiters, 0);
    const requested = data.consumption.reduce((s, r) => s + r.fuelRequestedLiters, 0);
    const variance = requested > 0 ? (approved - requested) / requested : 0;
    const summary = [
      { metric: 'Total disetujui (L)', value: approved.toLocaleString('id-ID') },
      { metric: 'Total diajukan (L)', value: requested.toLocaleString('id-ID') },
      { metric: 'Varian (%)', value: `${(variance * 100).toFixed(1)}%` },
      { metric: 'Kendaraan terpantau', value: String(data.consumption.length) },
    ];
    this.addSheet<{ metric: string; value: string }>(
      wb,
      'Ringkasan',
      TITLE,
      period,
      [
        { header: 'Metrik', key: 'metric', width: 28 },
        { header: 'Nilai', key: 'value', width: 24 },
      ],
      summary,
    );

    this.addSheet<FuelConsumptionRow>(
      wb,
      'Per Kendaraan',
      TITLE,
      period,
      [
        { header: 'Nopol', key: 'plateNumber', width: 16 },
        { header: 'Disetujui (L)', key: 'fuelApprovedLiters', width: 16, numFmt: FMT_LITER },
        { header: 'Diajukan (L)', key: 'fuelRequestedLiters', width: 16, numFmt: FMT_LITER },
        {
          header: 'Varian (%)',
          key: 'variancePercent',
          width: 14,
          numFmt: FMT_PCT,
          value: (r) => r.variancePercent / 100,
        },
        { header: 'Status', key: 'flag', width: 10 },
      ],
      [...data.consumption].sort((a, b) => a.variancePercent - b.variancePercent),
      { totals: ['fuelApprovedLiters', 'fuelRequestedLiters'], freeze: true },
    );

    this.addSheet<FuelByTypeRow>(
      wb,
      'Per Jenis BBM',
      TITLE,
      period,
      [
        { header: 'Jenis BBM', key: 'fuelName', width: 24 },
        { header: 'Disetujui (L)', key: 'totalApprovedLiters', width: 16, numFmt: FMT_LITER },
        { header: 'Diajukan (L)', key: 'totalRequestedLiters', width: 16, numFmt: FMT_LITER },
      ],
      data.byType,
      { totals: ['totalApprovedLiters', 'totalRequestedLiters'] },
    );

    this.addSheet<FuelConsumptionRow>(
      wb,
      'Analisis Varian',
      TITLE,
      period,
      [
        { header: 'Nopol', key: 'plateNumber', width: 16 },
        { header: 'Disetujui (L)', key: 'fuelApprovedLiters', width: 16, numFmt: FMT_LITER },
        { header: 'Diajukan (L)', key: 'fuelRequestedLiters', width: 16, numFmt: FMT_LITER },
        {
          header: 'Varian (%)',
          key: 'variancePercent',
          width: 14,
          numFmt: FMT_PCT,
          value: (r) => r.variancePercent / 100,
        },
      ],
      data.consumption.filter((r) => r.flag === 'RED'),
    );

    return this.toBuffer(wb);
  }
}
