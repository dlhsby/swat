import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type DisposalPermitStatus, type Prisma } from '@prisma/client';

import { formatDateOnly, parseDateOnly } from '../../../common/dates';
import { paginated } from '../../../common/pagination';
import { type PaginationMeta } from '../../../common/types/api-response';
import { ActorNamesService } from '../../audit/actor-names.service';

import {
  DisposalPermitsRepository,
  type DisposalPermitWithRefs,
} from './disposal-permits.repository';
import {
  BulkImportStrategy,
  type BulkDisposalPermitRowDto,
  type BulkImportDisposalPermitsDto,
  type BulkImportResult,
} from './dto/bulk-import-disposal-permits.dto';
import { type BulkIssueDisposalPermitsDto } from './dto/bulk-issue-disposal-permits.dto';
import { type CreateDisposalPermitDto } from './dto/create-disposal-permit.dto';
import { type ListDisposalPermitsQueryDto } from './dto/list-disposal-permits.query.dto';
import { type UpdateDisposalPermitDto } from './dto/update-disposal-permit.dto';

/** True when a Prisma write tripped the unique constraint on `code` (P2002). */
function isCodeUniqueViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) {
    return false;
  }
  const e = err as { code?: string; meta?: { target?: unknown } };
  if (e.code !== 'P2002') {
    return false;
  }
  const target = e.meta?.target;
  return (
    target === 'disposal_permit_code_key' || (Array.isArray(target) && target.includes('code'))
  );
}

export interface DisposalPermitDto {
  readonly id: string;
  readonly code: string | null;
  readonly vehicleId: string;
  readonly vehiclePlate: string;
  readonly siteId: string;
  readonly siteName: string;
  readonly status: DisposalPermitStatus;
  readonly issuedAt: string;
  readonly validFrom: string;
  readonly validTo: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

function toDto(permit: DisposalPermitWithRefs): DisposalPermitDto {
  return {
    id: permit.id,
    code: permit.code,
    vehicleId: permit.vehicleId,
    vehiclePlate: permit.vehicle.plateNumber,
    siteId: permit.siteId,
    siteName: permit.site.name,
    status: permit.status,
    issuedAt: formatDateOnly(permit.issuedAt),
    validFrom: formatDateOnly(permit.validFrom),
    validTo: formatDateOnly(permit.validTo),
    createdAt: permit.createdAt.toISOString(),
    updatedAt: permit.updatedAt.toISOString(),
  };
}

@Injectable()
export class DisposalPermitsService {
  constructor(
    private readonly repo: DisposalPermitsRepository,
    private readonly actorNames: ActorNamesService,
  ) {}

  async list(
    query: ListDisposalPermitsQueryDto,
  ): Promise<{ data: DisposalPermitDto[]; meta: PaginationMeta }> {
    const { rows, total } = await this.repo.list({
      page: query.page,
      limit: query.limit,
      vehicleId: query.vehicleId,
      siteId: query.siteId,
      status: query.status,
      activeOn: query.activeOn ? parseDateOnly(query.activeOn) : undefined,
      search: query.search,
    });
    return paginated(await this.actorNames.attach(rows, rows.map(toDto)), total, query);
  }

  async getById(id: string): Promise<DisposalPermitDto> {
    const permit = await this.repo.findById(id);
    if (!permit) {
      throw new NotFoundException('Jatah kitir tidak ditemukan.');
    }
    return toDto(permit);
  }

  async create(dto: CreateDisposalPermitDto): Promise<DisposalPermitDto> {
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

    // The kitir code is the printable barcode. Auto-generate KT-YYYYMM-NNNN from
    // the issue month + a per-month counter unless an explicit code was supplied
    // (bulk import / migration). Retry on the rare concurrent-counter collision.
    for (let attempt = 0; ; attempt += 1) {
      const code = dto.code ?? (await this.generateCode(issuedAt));
      try {
        const permit = await this.repo.create({
          code,
          ...(dto.status !== undefined ? { status: dto.status } : {}),
          issuedAt,
          validFrom,
          validTo,
          // Scalar FKs (unchecked input): the audit middleware stamps the scalar
          // createdById/updatedById, which the relation-style (checked) input would
          // reject because DisposalPermit declares createdBy/updatedBy relations.
          vehicleId: dto.vehicleId,
          siteId: dto.siteId,
        });
        return toDto(permit);
      } catch (err) {
        if (dto.code === undefined && attempt < 4 && isCodeUniqueViolation(err)) {
          continue;
        }
        throw err;
      }
    }
  }

  /**
   * Issue N identical kitir at once (legacy `insertJatahKitir`). Reuses `create()`
   * so each gets its own KT-YYYYMM-NNNN barcode + validation; returns all N with
   * the printable fields the kitir app needs. Created sequentially so the
   * per-month code counter stays consistent (matches the legacy loop).
   */
  async bulkIssue(dto: BulkIssueDisposalPermitsDto): Promise<DisposalPermitDto[]> {
    const issuedAt = dto.issuedAt ?? formatDateOnly(new Date());
    const created: DisposalPermitDto[] = [];
    for (let i = 0; i < dto.count; i += 1) {
      created.push(
        await this.create({
          vehicleId: dto.vehicleId,
          siteId: dto.siteId,
          issuedAt,
          validFrom: dto.validFrom,
          validTo: dto.validTo,
        }),
      );
    }
    return created;
  }

  /** Next barcode for the issue month: `KT-YYYYMM-NNNN`, counter per period. */
  private async generateCode(issuedAt: Date): Promise<string> {
    const period = `${issuedAt.getUTCFullYear()}${String(issuedAt.getUTCMonth() + 1).padStart(2, '0')}`;
    const prefix = `KT-${period}-`;
    const last = await this.repo.maxCodeForPrefix(prefix);
    const lastNum = last ? Number(last.slice(prefix.length)) : 0;
    const next = Number.isFinite(lastNum) ? lastNum + 1 : 1;
    return `${prefix}${String(next).padStart(4, '0')}`;
  }

  async update(id: string, dto: UpdateDisposalPermitDto): Promise<DisposalPermitDto> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException('Jatah kitir tidak ditemukan.');
    }
    if (dto.validTo !== undefined) {
      const validTo = parseDateOnly(dto.validTo);
      if (validTo.getTime() < existing.validFrom.getTime()) {
        throw new BadRequestException('Berlaku sampai tidak boleh sebelum berlaku dari.');
      }
    }

    const permit = await this.repo.update(id, {
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.validTo !== undefined ? { validTo: parseDateOnly(dto.validTo) } : {}),
      // updatedById is stamped by the audit middleware (see create()).
    });
    return toDto(permit);
  }

  /**
   * Bulk-import permits (Impor Massal). Rows are validated against existing
   * vehicles/sites + date order; valid rows are upserted by `legacyId`
   * (idempotent re-runs), invalid rows reported with their 1-based row number.
   */
  async bulkImport(dto: BulkImportDisposalPermitsDto): Promise<BulkImportResult> {
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
        await this.persistBulkRow(row, isExisting, issuedAt);
        if (isExisting) {
          updated += 1;
        } else {
          imported += 1;
          // A legacyId just created in this batch is now "existing" — a later
          // duplicate row must upsert/skip, not re-create (which would 409).
          if (row.legacyId !== undefined) {
            existingLegacy.add(row.legacyId);
          }
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
    row: BulkDisposalPermitRowDto,
    vehicleIds: Set<string>,
    siteIds: Set<string>,
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
    row: BulkDisposalPermitRowDto,
    isExisting: boolean,
    issuedAt: Date,
  ): Promise<void> {
    const validFrom = parseDateOnly(row.validFrom);
    const validTo = parseDateOnly(row.validTo);
    // Barcode: prefer an explicit code, else fall back to the legacy JATAHKITIR_ID
    // (the legacy app printed that id as the barcode, so this keeps already-printed
    // kitir scannable). In-app issues use the KT-YYYYMM-NNNN generator instead.
    // (createdById/updatedById are stamped by the audit middleware.)
    const code = row.code ?? (row.legacyId !== undefined ? String(row.legacyId) : undefined);
    const create: Prisma.DisposalPermitUncheckedCreateInput = {
      ...(code !== undefined ? { code } : {}),
      ...(row.status !== undefined ? { status: row.status } : {}),
      issuedAt,
      validFrom,
      validTo,
      vehicleId: row.vehicleId,
      siteId: row.siteId,
    };
    if (isExisting && row.legacyId !== undefined) {
      // Re-import resurrects a soft-deleted kitir (deletedAt → null) so a previously
      // deleted legacyId round-trips instead of hitting the unique constraint.
      await this.repo.upsertByLegacyId(row.legacyId, create, {
        ...(code !== undefined ? { code } : {}),
        ...(row.status !== undefined ? { status: row.status } : {}),
        validFrom,
        validTo,
        vehicleId: row.vehicleId,
        siteId: row.siteId,
        deletedAt: null,
        deletedById: null,
      });
      return;
    }
    await this.repo.createPlain(
      row.legacyId !== undefined ? { ...create, legacyId: row.legacyId } : create,
    );
  }

  private async assertRefsExist(vehicleId: string, siteId: string): Promise<void> {
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
