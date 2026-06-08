import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type FuelQuotaStatus } from '@prisma/client';

import { formatDateOnly, parseDateOnly } from '../../../common/dates';
import { paginated } from '../../../common/pagination';
import { type PaginationMeta } from '../../../common/types/api-response';

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
