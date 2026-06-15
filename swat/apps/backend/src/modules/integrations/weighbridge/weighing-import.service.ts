import { BadRequestException, Injectable } from '@nestjs/common';
import { type Row, Workbook } from 'exceljs';

import { PrismaService } from '../../prisma/prisma.service';

import { ConversionService } from './conversion.service';

export interface WeighingImportSummary {
  readonly totalRows: number;
  readonly inserted: number;
  readonly skipped: number;
  readonly errors: ReadonlyArray<{ row: number; message: string }>;
}

interface ParsedRow {
  readonly rowNumber: number;
  readonly date: Date;
  readonly dateLabel: string;
  readonly plateNumber: string;
  readonly grossWeight: number;
  readonly tareWeight: number;
  readonly netWeight: number;
  readonly depot: string | null;
}

/** Header aliases (lower-cased) → canonical field. Tolerant of legacy variations. */
const HEADER_ALIASES: Readonly<Record<string, keyof ColumnIndex>> = {
  tanggal: 'date',
  date: 'date',
  nopol: 'plate',
  'nomor polisi': 'plate',
  'plat nomor': 'plate',
  platenumber: 'plate',
  'berat kotor': 'gross',
  bruto: 'gross',
  gross: 'gross',
  'berat kosong': 'tare',
  tara: 'tare',
  tare: 'tare',
  depo: 'depot',
  depot: 'depot',
  pool: 'depot',
  sumber: 'depot',
};

interface ColumnIndex {
  date: number;
  plate: number;
  gross: number;
  tare: number;
  depot: number;
}

/**
 * Bulk Excel weighing upload ("Upload Data Penimbangan", legacy `importexcel` —
 * Phase 4, parity G14). Parses the workbook, translates legacy SI names via
 * {@link ConversionService}, computes net weight server-side, and upserts
 * {@link TpaInboundLog} rows (the reconciliation source). Idempotent: a row whose
 * natural key (date+plate+gross+net) already exists is skipped, so re-uploading
 * the same file inserts nothing new. Distinct from the Phase-1 kitir bulk import.
 */
@Injectable()
export class WeighingImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversion: ConversionService,
  ) {}

  async importExcel(buffer: Buffer): Promise<WeighingImportSummary> {
    const workbook = new Workbook();
    try {
      // exceljs ships an older Buffer typing; the runtime accepts a Node Buffer.
      await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    } catch {
      throw new BadRequestException('Berkas Excel tidak dapat dibaca');
    }
    const sheet = workbook.worksheets[0];
    if (!sheet || sheet.rowCount < 2) {
      throw new BadRequestException('Berkas Excel kosong atau tanpa data');
    }

    const columns = this.resolveColumns(sheet.getRow(1));
    const translator = await this.conversion.load('POOL');

    const errors: Array<{ row: number; message: string }> = [];
    const parsed: ParsedRow[] = [];
    for (let r = 2; r <= sheet.rowCount; r += 1) {
      const row = sheet.getRow(r);
      if (isEmptyRow(row, columns)) {
        continue;
      }
      try {
        parsed.push(this.parseRow(row, r, columns, translator));
      } catch (error) {
        errors.push({
          row: r,
          message: error instanceof Error ? error.message : 'Baris tidak valid',
        });
      }
    }

    // Dedup against existing rows (one query scoped to the batch's dates+plates)
    // and within the batch itself, by natural key — so an idempotent re-upload
    // inserts nothing new — then bulk-insert the survivors in a single statement.
    const seen = new Set<string>();
    if (parsed.length > 0) {
      const existing = await this.prisma.tpaInboundLog.findMany({
        where: {
          date: { in: parsed.map((r) => r.date) },
          plateNumber: { in: parsed.map((r) => r.plateNumber) },
        },
        select: { date: true, plateNumber: true, grossWeight: true, netWeight: true },
      });
      for (const row of existing) {
        if (
          row.date &&
          row.plateNumber != null &&
          row.grossWeight != null &&
          row.netWeight != null
        ) {
          seen.add(naturalKey(row.date, row.plateNumber, row.grossWeight, row.netWeight));
        }
      }
    }

    let skipped = 0;
    const toInsert: ParsedRow[] = [];
    for (const item of parsed) {
      const key = naturalKey(item.date, item.plateNumber, item.grossWeight, item.netWeight);
      if (seen.has(key)) {
        skipped += 1;
        continue;
      }
      seen.add(key);
      toInsert.push(item);
    }

    if (toInsert.length > 0) {
      await this.prisma.tpaInboundLog.createMany({
        data: toInsert.map((item) => ({
          dateLabel: item.dateLabel,
          date: item.date,
          plateNumber: item.plateNumber,
          depot: item.depot,
          sourceTruck: item.plateNumber,
          grossWeight: item.grossWeight,
          tareWeight: item.tareWeight,
          netWeight: item.netWeight,
        })),
      });
    }

    return { totalRows: parsed.length + errors.length, inserted: toInsert.length, skipped, errors };
  }

  private resolveColumns(header: Row): ColumnIndex {
    const columns: ColumnIndex = { date: 0, plate: 0, gross: 0, tare: 0, depot: 0 };
    header.eachCell((cell, col) => {
      const key =
        HEADER_ALIASES[
          String(cell.value ?? '')
            .trim()
            .toLowerCase()
        ];
      if (key) {
        columns[key] = col;
      }
    });
    if (!columns.date || !columns.plate || !columns.gross || !columns.tare) {
      throw new BadRequestException(
        'Kolom wajib tidak ditemukan (tanggal, nopol, berat kotor, berat kosong)',
      );
    }
    return columns;
  }

  private parseRow(
    row: Row,
    rowNumber: number,
    columns: ColumnIndex,
    translator: { translate: (value: string) => string },
  ): ParsedRow {
    const dateLabel = cellText(row, columns.date);
    const date = parseExcelDate(row.getCell(columns.date).value, dateLabel);
    const plateNumber = cellText(row, columns.plate).toUpperCase();
    const grossWeight = cellNumber(row, columns.gross);
    const tareWeight = cellNumber(row, columns.tare);
    if (!plateNumber) {
      throw new Error('Nomor polisi kosong');
    }
    if (grossWeight < tareWeight) {
      throw new Error('Berat kotor lebih kecil dari berat kosong');
    }
    const depotRaw = columns.depot ? cellText(row, columns.depot) : '';
    return {
      rowNumber,
      date,
      dateLabel,
      plateNumber,
      grossWeight,
      tareWeight,
      netWeight: grossWeight - tareWeight,
      depot: depotRaw ? translator.translate(depotRaw) : null,
    };
  }
}

function isEmptyRow(row: Row, columns: ColumnIndex): boolean {
  return !cellText(row, columns.plate) && !cellText(row, columns.date);
}

function cellText(row: Row, col: number): string {
  if (!col) {
    return '';
  }
  return String(row.getCell(col).value ?? '').trim();
}

function cellNumber(row: Row, col: number): number {
  const value = row.getCell(col).value;
  const num =
    typeof value === 'number' ? value : Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(num) || num < 0) {
    throw new Error('Nilai berat tidak valid');
  }
  return Math.round(num);
}

/** Stable dedup key for a weighing row. */
function naturalKey(
  date: Date,
  plateNumber: string,
  grossWeight: number,
  netWeight: number,
): string {
  return `${date.toISOString()}|${plateNumber}|${grossWeight}|${netWeight}`;
}

/** Accept an Excel date serial/Date, or a `YYYY-MM-DD` / `DD-MM-YYYY` string.
 * Rejects out-of-range values (e.g. `2026-13-32`) — `new Date` yields an Invalid
 * Date, which must not reach Prisma (it would abort the whole batch). */
function parseExcelDate(value: unknown, label: string): Date {
  const candidate = toCandidateDate(value, label);
  if (candidate === null || Number.isNaN(candidate.getTime())) {
    throw new Error('Format tanggal tidak dikenali');
  }
  return candidate;
}

function toCandidateDate(value: unknown, label: string): Date | null {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
    return new Date(`${label}T00:00:00.000Z`);
  }
  const dmy = label.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (dmy) {
    return new Date(`${dmy[3]}-${dmy[2]}-${dmy[1]}T00:00:00.000Z`);
  }
  return null;
}
