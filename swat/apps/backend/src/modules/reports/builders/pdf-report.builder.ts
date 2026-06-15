import { Injectable } from '@nestjs/common';
import { type Content } from 'pdfmake/interfaces';

import { type ReportType } from '../report.types';

import { type FuelReportData } from './fuel-report.builder';
import { type LevyReportData } from './levy-report.builder';
import { PdfGeneratorService } from './pdf-generator.service';
import { type RouteReportData } from './route-report.builder';
import { type TonnageReportData } from './tonnage-report.builder';

export type ReportDataset = TonnageReportData | FuelReportData | RouteReportData | LevyReportData;

const idr = (n: number): string => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
const num = (n: number): string => Math.round(n).toLocaleString('id-ID');
const fmtDate = (v: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
};

/**
 * Single-page PDF summaries for each report type — a lightweight, print/email
 * friendly companion to the multi-sheet Excel export. Content mirrors the Excel
 * summary (KPIs + the headline table) so the two formats agree.
 */
@Injectable()
export class PdfReportBuilder {
  constructor(private readonly pdf: PdfGeneratorService) {}

  build(reportType: ReportType, data: ReportDataset): Promise<Buffer> {
    const period = `Periode: ${fmtDate(data.dateFrom)} s/d ${fmtDate(data.dateTo)}`;
    switch (reportType) {
      case 'tonnage':
        return this.pdf.generate(this.tonnage(data as TonnageReportData, period));
      case 'fuel':
        return this.pdf.generate(this.fuel(data as FuelReportData, period));
      case 'route':
        return this.pdf.generate(this.route(data as RouteReportData, period));
      case 'levy':
        return this.pdf.generate(this.levy(data as LevyReportData, period));
    }
  }

  private tonnage(data: TonnageReportData, period: string): Content[] {
    const total = data.daily.reduce((s, r) => s + r.totalTonnageKg, 0);
    const hauls = data.daily.reduce((s, r) => s + r.haulCount, 0);
    const avg = data.daily.length ? Math.round(total / data.daily.length) : 0;
    return [
      this.pdf.header('Laporan Tonase Pengangkutan Sampah', period),
      this.pdf.kpiCards([
        { label: 'Total Tonase', value: `${num(total)} kg` },
        { label: 'Jumlah Angkut', value: num(hauls) },
        { label: 'Rata-rata/Hari', value: `${num(avg)} kg` },
      ]),
      { text: 'Ringkasan Bulanan', bold: true, margin: [0, 4, 0, 4] },
      this.pdf.table(
        ['Bulan', 'Total (kg)', 'Jumlah Angkut'],
        data.monthly.map((r) => [r.month, num(r.totalTonnageKg), num(r.haulCount)]),
        ['*', 'auto', 'auto'],
      ),
    ];
  }

  private fuel(data: FuelReportData, period: string): Content[] {
    const approved = data.consumption.reduce((s, r) => s + r.fuelApprovedLiters, 0);
    const requested = data.consumption.reduce((s, r) => s + r.fuelRequestedLiters, 0);
    const variance = requested > 0 ? ((approved - requested) / requested) * 100 : 0;
    const top = [...data.consumption]
      .sort((a, b) => a.variancePercent - b.variancePercent)
      .slice(0, 20);
    return [
      this.pdf.header('Laporan Konsumsi Bahan Bakar', period),
      this.pdf.kpiCards([
        { label: 'Disetujui (L)', value: num(approved) },
        { label: 'Diajukan (L)', value: num(requested) },
        { label: 'Varian', value: `${variance.toFixed(1)}%` },
      ]),
      { text: 'Konsumsi per Kendaraan', bold: true, margin: [0, 4, 0, 4] },
      this.pdf.table(
        ['Nopol', 'Disetujui (L)', 'Diajukan (L)', 'Varian (%)', 'Status'],
        top.map((r) => [
          r.plateNumber,
          num(r.fuelApprovedLiters),
          num(r.fuelRequestedLiters),
          r.variancePercent.toFixed(1),
          r.flag,
        ]),
      ),
    ];
  }

  private route(data: RouteReportData, period: string): Content[] {
    const top = [...data.routes].sort((a, b) => b.tripCount - a.tripCount).slice(0, 20);
    return [
      this.pdf.header('Laporan Aktivitas Rute', period),
      { text: 'Frekuensi Rute (Top 20)', bold: true, margin: [0, 4, 0, 4] },
      this.pdf.table(
        ['#', 'Rute', 'Kategori', 'Frekuensi'],
        top.map((r, i) => [
          i + 1,
          `${r.originSiteName} → ${r.destinationSiteName}`,
          r.category,
          num(r.tripCount),
        ]),
        ['auto', '*', 'auto', 'auto'],
      ),
    ];
  }

  private levy(data: LevyReportData, period: string): Content[] {
    const grandTotal = data.summary.reduce((s, r) => s + r.totalAmount, 0);
    return [
      this.pdf.header('Laporan Retribusi', period),
      this.pdf.kpiCards([{ label: 'Total Retribusi', value: idr(grandTotal) }]),
      { text: 'Ringkasan per Kategori', bold: true, margin: [0, 4, 0, 4] },
      this.pdf.table(
        ['Kategori', 'Jumlah (Rp)', 'Transaksi', 'Rata-rata (Rp)'],
        data.summary.map((r) => [
          r.categoryName,
          idr(r.totalAmount),
          num(r.transactionCount),
          idr(r.avgPerTransaction),
        ]),
        ['*', 'auto', 'auto', 'auto'],
      ),
      {
        columns: [
          { text: '', width: '*' },
          {
            width: 'auto',
            stack: [
              { text: 'Mengetahui,', style: 'signature' },
              { text: '\n\n\n' },
              { text: 'Kepala Dinas Lingkungan Hidup', bold: true },
            ],
          },
        ],
      },
    ];
  }
}
