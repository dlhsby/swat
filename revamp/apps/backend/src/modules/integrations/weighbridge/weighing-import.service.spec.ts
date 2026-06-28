import { BadRequestException } from '@nestjs/common';
import { Workbook } from 'exceljs';

import { type PrismaService } from '../../prisma/prisma.service';

import { type ConversionService } from './conversion.service';
import { WeighingImportService } from './weighing-import.service';

async function buildWorkbook(
  rows: Array<[string, string, number, number, string?]>,
  header: string[] = ['Tanggal', 'Nopol', 'Berat Kotor', 'Berat Kosong', 'Depot'],
): Promise<Buffer> {
  const wb = new Workbook();
  const sheet = wb.addWorksheet('Penimbangan');
  sheet.addRow(header);
  for (const row of rows) {
    sheet.addRow(row);
  }
  return Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
}

describe('WeighingImportService', () => {
  let prisma: { tpaInboundLog: { findMany: jest.Mock; createMany: jest.Mock } };
  let conversion: { load: jest.Mock };
  let service: WeighingImportService;

  beforeEach(() => {
    prisma = {
      tpaInboundLog: {
        findMany: jest.fn().mockResolvedValue([]),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    conversion = { load: jest.fn().mockResolvedValue({ translate: (v: string) => `SWAT:${v}` }) };
    service = new WeighingImportService(
      prisma as unknown as PrismaService,
      conversion as unknown as ConversionService,
    );
  });

  it('imports valid rows in one createMany, computing net server-side and translating the depot', async () => {
    const buffer = await buildWorkbook([['2026-06-05', 'L-1234-AB', 6200, 4200, 'Pool Wonokromo']]);

    const summary = await service.importExcel(buffer);

    expect(summary.inserted).toBe(1);
    expect(summary.skipped).toBe(0);
    expect(prisma.tpaInboundLog.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          plateNumber: 'L-1234-AB',
          netWeight: 2000,
          depot: 'SWAT:Pool Wonokromo',
        }),
      ],
    });
  });

  it('skips a row whose natural key already exists (idempotent re-upload)', async () => {
    prisma.tpaInboundLog.findMany.mockResolvedValue([
      {
        date: new Date('2026-06-05T00:00:00.000Z'),
        plateNumber: 'L-1234-AB',
        grossWeight: 6200,
        netWeight: 2000,
      },
    ]);
    const buffer = await buildWorkbook([['2026-06-05', 'L-1234-AB', 6200, 4200, 'Pool']]);

    const summary = await service.importExcel(buffer);

    expect(summary.skipped).toBe(1);
    expect(summary.inserted).toBe(0);
    expect(prisma.tpaInboundLog.createMany).not.toHaveBeenCalled();
  });

  it('records a per-row error when gross < tare without aborting the batch', async () => {
    const buffer = await buildWorkbook([
      ['2026-06-05', 'L-1', 4000, 4200, 'Pool'],
      ['2026-06-05', 'L-2', 6000, 4000, 'Pool'],
    ]);

    const summary = await service.importExcel(buffer);

    expect(summary.inserted).toBe(1);
    expect(summary.errors).toHaveLength(1);
    expect(summary.errors[0]?.row).toBe(2);
  });

  it('records a per-row error for an out-of-range date instead of aborting', async () => {
    const buffer = await buildWorkbook([['2026-13-32', 'L-9', 6000, 4000, 'Pool']]);

    const summary = await service.importExcel(buffer);

    expect(summary.inserted).toBe(0);
    expect(summary.errors).toHaveLength(1);
    expect(prisma.tpaInboundLog.createMany).not.toHaveBeenCalled();
  });

  it('rejects a workbook missing required columns', async () => {
    const buffer = await buildWorkbook([['2026-06-05', 'L-1', 6000, 4000]], ['A', 'B', 'C', 'D']);
    await expect(service.importExcel(buffer)).rejects.toBeInstanceOf(BadRequestException);
  });
});
