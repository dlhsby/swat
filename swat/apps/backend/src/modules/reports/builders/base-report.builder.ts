/* eslint-disable no-param-reassign -- ExcelJS styling is mutation-based: cells,
   rows, and worksheets are configured by assigning to their properties. */
import { type Row, Workbook, type Worksheet } from 'exceljs';

/**
 * Shared Excel styling for the DLH report builders. Provides a single
 * `addSheet` helper that renders a branded, formula-driven table (header block →
 * styled header row → striped data rows → SUM totals row), so each report
 * builder only describes columns + rows.
 *
 * NOTE: ExcelJS cannot author native charts (read-only for charts), so the
 * builders surface chart-ready data (e.g. a "% of total" column) as tabular
 * columns rather than embedding a pie/line chart. The interactive charts live in
 * the web dashboards; the export is tabular by design.
 */
export const DLH_GREEN = 'FF006633';
export const DLH_GREEN_LIGHT = 'FFE6F0EA';
export const DLH_ORG = 'Dinas Lingkungan Hidup Kota Surabaya';

export const FMT_INT = '#,##0';
export const FMT_KG = '#,##0 "kg"';
export const FMT_IDR = '"Rp" #,##0';
export const FMT_PCT = '0.0%';
export const FMT_LITER = '#,##0.0 "L"';

export interface ReportColumn<T> {
  header: string;
  key: keyof T & string;
  width?: number;
  numFmt?: string;
  /** Derive the cell value from the row (defaults to row[key]). */
  value?: (row: T) => string | number | null;
}

export interface AddSheetOptions<T> {
  /** Column keys to sum into a bold TOTAL row (via SUM formulas, not constants). */
  totals?: Array<keyof T & string>;
  /** Freeze the header rows for scrolling. */
  freeze?: boolean;
}

const HEADER_ROW = 5; // rows 1–3 hold the brand block, row 4 is a spacer

export abstract class BaseReportBuilder {
  protected newWorkbook(): Workbook {
    const wb = new Workbook();
    wb.creator = 'SWAT — Sistem Manajemen Armada';
    wb.created = new Date();
    return wb;
  }

  protected formatPeriod(dateFrom: string, dateTo: string): string {
    return `Periode: ${this.formatDate(dateFrom)} s/d ${this.formatDate(dateTo)}`;
  }

  /** YYYY-MM-DD → DD/MM/YYYY (leaves already-formatted/empty input untouched). */
  protected formatDate(value: string): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : value;
  }

  /** Render one branded sheet. Returns the worksheet for any extra tweaks. */
  protected addSheet<T extends object>(
    wb: Workbook,
    sheetName: string,
    title: string,
    period: string,
    columns: ReportColumn<T>[],
    rows: T[],
    opts: AddSheetOptions<T> = {},
  ): Worksheet {
    const ws = wb.addWorksheet(sheetName);
    const colCount = columns.length;
    ws.columns = columns.map((c) => ({ key: c.key, width: c.width ?? 18 }));

    this.addBrandBlock(ws, title, period, colCount);

    const headerRow = ws.getRow(HEADER_ROW);
    columns.forEach((c, i) => {
      headerRow.getCell(i + 1).value = c.header;
    });
    this.styleHeaderRow(headerRow);

    rows.forEach((row, ri) => {
      const excelRow = ws.getRow(HEADER_ROW + 1 + ri);
      columns.forEach((c, ci) => {
        const cell = excelRow.getCell(ci + 1);
        cell.value = c.value ? c.value(row) : ((row[c.key] ?? null) as string | number | null);
        if (c.numFmt) cell.numFmt = c.numFmt;
      });
      if (ri % 2 === 1) {
        excelRow.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DLH_GREEN_LIGHT } };
        });
      }
    });

    if (opts.totals?.length) {
      this.addTotalsRow(ws, columns, rows.length, opts.totals);
    }
    if (opts.freeze) {
      ws.views = [{ state: 'frozen', ySplit: HEADER_ROW }];
    }
    return ws;
  }

  private addBrandBlock(ws: Worksheet, title: string, period: string, colCount: number): void {
    const last = Math.max(colCount, 1);
    ws.mergeCells(1, 1, 1, last);
    ws.mergeCells(2, 1, 2, last);
    ws.mergeCells(3, 1, 3, last);
    const org = ws.getCell(1, 1);
    org.value = DLH_ORG;
    org.font = { bold: true, size: 14, color: { argb: DLH_GREEN } };
    const titleCell = ws.getCell(2, 1);
    titleCell.value = title;
    titleCell.font = { bold: true, size: 12 };
    ws.getCell(3, 1).value = period;
  }

  protected styleHeaderRow(row: Row): void {
    row.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DLH_GREEN } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = { bottom: { style: 'thin', color: { argb: DLH_GREEN } } };
    });
  }

  private addTotalsRow<T extends object>(
    ws: Worksheet,
    columns: ReportColumn<T>[],
    rowCount: number,
    totals: Array<keyof T & string>,
  ): void {
    const totalRowIdx = HEADER_ROW + 1 + rowCount;
    const totalRow = ws.getRow(totalRowIdx);
    totalRow.getCell(1).value = 'TOTAL';
    totalRow.eachCell((cell) => {
      cell.font = { bold: true };
    });
    for (const key of totals) {
      const ci = columns.findIndex((c) => c.key === key);
      if (ci < 0) continue;
      const cell = totalRow.getCell(ci + 1);
      const col = ws.getColumn(ci + 1).letter;
      const firstDataRow = HEADER_ROW + 1;
      const lastDataRow = HEADER_ROW + rowCount;
      cell.value =
        rowCount > 0 ? { formula: `SUM(${col}${firstDataRow}:${col}${lastDataRow})` } : 0;
      const numFmt = columns[ci]?.numFmt;
      if (numFmt) cell.numFmt = numFmt;
      cell.font = { bold: true };
    }
  }

  protected async toBuffer(wb: Workbook): Promise<Buffer> {
    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}
