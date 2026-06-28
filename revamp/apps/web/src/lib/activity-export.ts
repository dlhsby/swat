/**
 * Direct (client-side) report export for the Pencatatan Aktivitas recap grids —
 * mirrors the legacy `laporan/{tonase,bahanbakar}` exports (title + date subtitle
 * + numbered table, with a totals row where the legacy report had one) but renders
 * straight to a downloaded `.xlsx`/`.pdf` instead of the async Reports pipeline.
 *
 * The heavy renderers (ExcelJS, jsPDF) are lazy-imported so they only load when a
 * user actually exports.
 */

export type ExportFormat = 'xlsx' | 'pdf';

export interface ExportColumn<T> {
  readonly header: string;
  readonly value: (row: T, index: number) => string | number;
  /** Right-align the column (numbers). */
  readonly numeric?: boolean;
  /** Sum this column into a TOTAL row at the foot of the table. */
  readonly total?: boolean;
}

export interface ExportSpec<T> {
  readonly title: string;
  readonly subtitle: string;
  /** Base filename without extension. */
  readonly filename: string;
  readonly columns: readonly ExportColumn<T>[];
  readonly rows: readonly T[];
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Sum the `total`-flagged columns across all rows (numeric values only). */
function totalsRow<T>(spec: ExportSpec<T>): (string | number)[] | null {
  if (!spec.columns.some((c) => c.total)) return null;
  return spec.columns.map((c, i) => {
    if (i === 0) return 'TOTAL';
    if (!c.total) return '';
    return spec.rows.reduce((sum, row, r) => {
      const v = c.value(row, r);
      return sum + (typeof v === 'number' ? v : 0);
    }, 0);
  });
}

export async function exportActivityXlsx<T>(spec: ExportSpec<T>): Promise<void> {
  const { Workbook } = await import('exceljs');
  const wb = new Workbook();
  const ws = wb.addWorksheet('Laporan');
  const colCount = spec.columns.length;

  ws.mergeCells(1, 1, 1, colCount);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = spec.title;
  titleCell.font = { size: 14, bold: true };
  titleCell.alignment = { horizontal: 'center' };

  ws.mergeCells(2, 1, 2, colCount);
  const subCell = ws.getCell(2, 1);
  subCell.value = spec.subtitle;
  subCell.alignment = { horizontal: 'center' };

  const headerRowIdx = 4;
  const headerRow = ws.getRow(headerRowIdx);
  spec.columns.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true };
    cell.alignment = { horizontal: 'center' };
    cell.border = { bottom: { style: 'thin' } };
  });

  spec.rows.forEach((row, r) => {
    const xr = ws.getRow(headerRowIdx + 1 + r);
    spec.columns.forEach((c, i) => {
      const cell = xr.getCell(i + 1);
      cell.value = c.value(row, r);
      if (c.numeric) cell.alignment = { horizontal: 'right' };
    });
  });

  const totals = totalsRow(spec);
  if (totals) {
    const xr = ws.getRow(headerRowIdx + 1 + spec.rows.length);
    totals.forEach((v, i) => {
      const cell = xr.getCell(i + 1);
      cell.value = v;
      cell.font = { bold: true };
    });
  }

  spec.columns.forEach((c, i) => {
    ws.getColumn(i + 1).width = Math.max(c.header.length + 2, 14);
  });

  const buffer = await wb.xlsx.writeBuffer();
  triggerDownload(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${spec.filename}.xlsx`,
  );
}

export async function exportActivityPdf<T>(spec: ExportSpec<T>): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF({ orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(14);
  doc.text(spec.title, pageWidth / 2, 14, { align: 'center' });
  doc.setFontSize(10);
  doc.text(spec.subtitle, pageWidth / 2, 20, { align: 'center' });

  const head = [spec.columns.map((c) => c.header)];
  const body = spec.rows.map((row, r) => spec.columns.map((c) => String(c.value(row, r))));
  const totals = totalsRow(spec);
  if (totals) body.push(totals.map(String));

  autoTable(doc, {
    head,
    body,
    startY: 26,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 118, 110], halign: 'center' },
    footStyles: { fontStyle: 'bold' },
  });

  doc.save(`${spec.filename}.pdf`);
}

export function exportActivity<T>(format: ExportFormat, spec: ExportSpec<T>): Promise<void> {
  return format === 'xlsx' ? exportActivityXlsx(spec) : exportActivityPdf(spec);
}
