import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type FuelQuotaStatus, type Prisma } from '@prisma/client';

import { formatDateOnly, parseDateOnly } from '../../../common/dates';
import { paginated } from '../../../common/pagination';
import { type PaginationMeta } from '../../../common/types/api-response';

import {
  BulkImportStrategy,
  type BulkFuelQuotaRowDto,
  type BulkImportFuelQuotasDto,
  type BulkImportResult,
} from './dto/bulk-import-fuel-quotas.dto';
import { type CreateFuelQuotaDto } from './dto/create-fuel-quota.dto';
import { type ListFuelQuotasQueryDto } from './dto/list-fuel-quotas.query.dto';
import { type UpdateFuelQuotaDto } from './dto/update-fuel-quota.dto';
import { FuelQuotasRepository, type FuelQuotaWithRefs } from './fuel-quotas.repository';

export interface FuelQuotaDto {
  readonly id: string;
  readonly code: string | null;
  readonly vehicleId: number;
  readonly vehiclePlate: string;
  readonly siteId: number;
  readonly siteName: string;
  readonly status: FuelQuotaStatus;
  readonly issuedAt: string;
  readonly validFrom: string;
  readonly validTo: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

function toDto(quota: FuelQuotaWithRefs): FuelQuotaDto {
  return {
    id: quota.id.toString(),
    code: quota.code,
    vehicleId: quota.vehicleId,
    vehiclePlate: quota.vehicle.plateNumber,
    siteId: quota.siteId,
    siteName: quota.site.name,
    status: quota.status,
    issuedAt: formatDateOnly(quota.issuedAt),
    validFrom: formatDateOnly(quota.validFrom),
    validTo: formatDateOnly(quota.validTo),
    createdAt: quota.createdAt.toISOString(),
    updatedAt: quota.updatedAt.toISOString(),
  };
}

@Injectable()
export class FuelQuotasService {
  constructor(private readonly repo: FuelQuotasRepository) {}

  async list(
    query: ListFuelQuotasQueryDto,
  ): Promise<{ data: FuelQuotaDto[]; meta: PaginationMeta }> {
    const { rows, total } = await this.repo.list({
      page: query.page,
      limit: query.limit,
      vehicleId: query.vehicleId,
      siteId: query.siteId,
      status: query.status,
      activeOn: query.activeOn ? parseDateOnly(query.activeOn) : undefined,
    });
    return paginated(rows.map(toDto), total, query);
  }

  async getById(id: string): Promise<FuelQuotaDto> {
    const quota = await this.repo.findById(this.toBigInt(id));
    if (!quota) {
      throw new NotFoundException('Jatah kitir tidak ditemukan.');
    }
    return toDto(quota);
  }

  async create(dto: CreateFuelQuotaDto, userId: number): Promise<FuelQuotaDto> {
    const issuedAt = parseDateOnly(dto.issuedAt);
    const validFrom = parseDateOnly(dto.validFrom);
    const validTo = parseDateOnly(dto.validTo);
    if (validFrom.getTime() > validTo.getTime()) {
      throw new BadRequestException('Tanggal berlaku dari tidak boleh setelah berlaku sampai.');
    }
    if (issuedAt.getTime() > validTo.getTime()) {
      throw new BadRequestException('Tanggal terbit tidak boleh setelah berlaku sampai.');
    }
    await this.assertRefsExist(dto.vehicleId, dto.siteId);

    const quota = await this.repo.create({
      ...(dto.code !== undefined ? { code: dto.code } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      issuedAt,
      validFrom,
      validTo,
      vehicle: { connect: { id: dto.vehicleId } },
      site: { connect: { id: dto.siteId } },
      createdBy: { connect: { id: userId } },
    });
    return toDto(quota);
  }

  async update(id: string, dto: UpdateFuelQuotaDto, userId: number): Promise<FuelQuotaDto> {
    const existing = await this.repo.findById(this.toBigInt(id));
    if (!existing) {
      throw new NotFoundException('Jatah kitir tidak ditemukan.');
    }
    if (dto.validTo !== undefined) {
      const validTo = parseDateOnly(dto.validTo);
      if (validTo.getTime() < existing.validFrom.getTime()) {
        throw new BadRequestException('Berlaku sampai tidak boleh sebelum berlaku dari.');
      }
    }

    const quota = await this.repo.update(this.toBigInt(id), {
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.validTo !== undefined ? { validTo: parseDateOnly(dto.validTo) } : {}),
      updatedBy: { connect: { id: userId } },
    });
    return toDto(quota);
  }

  /**
   * Bulk-import quotas (Impor Massal). Rows are validated against existing
   * vehicles/sites + date order; valid rows are upserted by `legacyId`
   * (idempotent re-runs), invalid rows reported with their 1-based row number.
   */
  async bulkImport(dto: BulkImportFuelQuotasDto, userId: number): Promise<BulkImportResult> {
    const strategy = dto.strategy ?? BulkImportStrategy.UPSERT;
    const [vehicleIds, siteIds] = await Promise.all([
      this.repo.allVehicleIds(),
      this.repo.allSiteIds(),
    ]);
    const legacyIds = dto.rows.flatMap((r) => (r.legacyId !== undefined ? [r.legacyId] : []));
    const existingLegacy = await this.repo.existingLegacyIds(legacyIds);
    const issuedAt = new Date();

    const errors: Array<{ row: number; reason: string }> = [];
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (let i = 0; i < dto.rows.length; i += 1) {
      const row = dto.rows[i];
      if (!row) {
        continue;
      }
      const rowNumber = i + 1;
      const reason = this.validateBulkRow(row, vehicleIds, siteIds);
      if (reason) {
        errors.push({ row: rowNumber, reason });
        continue;
      }

      const isExisting = row.legacyId !== undefined && existingLegacy.has(row.legacyId);
      if (isExisting && strategy === BulkImportStrategy.SKIP) {
        skipped += 1;
        continue;
      }

      try {
        await this.persistBulkRow(row, isExisting, issuedAt, userId);
        if (isExisting) {
          updated += 1;
        } else {
          imported += 1;
        }
      } catch {
        errors.push({ row: rowNumber, reason: 'Gagal menyimpan baris.' });
      }
    }

    return {
      total: dto.rows.length,
      imported,
      updated,
      skipped,
      errorCount: errors.length,
      errors,
    };
  }

  private validateBulkRow(
    row: BulkFuelQuotaRowDto,
    vehicleIds: Set<number>,
    siteIds: Set<number>,
  ): string | null {
    if (!vehicleIds.has(row.vehicleId)) {
      return `Kendaraan #${row.vehicleId} tidak ditemukan.`;
    }
    if (!siteIds.has(row.siteId)) {
      return `Lokasi #${row.siteId} tidak ditemukan.`;
    }
    if (parseDateOnly(row.validFrom).getTime() > parseDateOnly(row.validTo).getTime()) {
      return 'Berlaku dari tidak boleh setelah berlaku sampai.';
    }
    return null;
  }

  private async persistBulkRow(
    row: BulkFuelQuotaRowDto,
    isExisting: boolean,
    issuedAt: Date,
    userId: number,
  ): Promise<void> {
    const validFrom = parseDateOnly(row.validFrom);
    const validTo = parseDateOnly(row.validTo);
    const create: Prisma.FuelQuotaCreateInput = {
      ...(row.code !== undefined ? { code: row.code } : {}),
      ...(row.status !== undefined ? { status: row.status } : {}),
      issuedAt,
      validFrom,
      validTo,
      vehicle: { connect: { id: row.vehicleId } },
      site: { connect: { id: row.siteId } },
      createdBy: { connect: { id: userId } },
    };
    if (isExisting && row.legacyId !== undefined) {
      await this.repo.upsertByLegacyId(row.legacyId, create, {
        ...(row.code !== undefined ? { code: row.code } : {}),
        ...(row.status !== undefined ? { status: row.status } : {}),
        validFrom,
        validTo,
        vehicle: { connect: { id: row.vehicleId } },
        site: { connect: { id: row.siteId } },
        updatedBy: { connect: { id: userId } },
      });
      return;
    }
    await this.repo.createPlain(
      row.legacyId !== undefined ? { ...create, legacyId: row.legacyId } : create,
    );
  }

  private toBigInt(id: string): bigint {
    try {
      return BigInt(id);
    } catch {
      throw new BadRequestException('ID jatah kitir tidak valid.');
    }
  }

  private async assertRefsExist(vehicleId: number, siteId: number): Promise<void> {
    const [vehicle, site] = await Promise.all([
      this.repo.vehicleExists(vehicleId),
      this.repo.siteExists(siteId),
    ]);
    if (!vehicle) {
      throw new BadRequestException('Kendaraan tidak ditemukan.');
    }
    if (!site) {
      throw new BadRequestException('Lokasi tidak ditemukan.');
    }
  }
}
