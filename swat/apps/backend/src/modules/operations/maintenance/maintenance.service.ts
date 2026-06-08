import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MaintenanceStatus, type MaintenanceType, type Prisma } from '@prisma/client';

import { type SessionUser } from '../../../common/auth/session.types';
import { formatDateOnly, parseDateOnly } from '../../../common/dates';
import { paginated } from '../../../common/pagination';
import { type PaginationMeta } from '../../../common/types/api-response';
import { AuditService } from '../../audit/audit.service';

import { type CreateMaintenanceDto } from './dto/create-maintenance.dto';
import { type ListMaintenanceQueryDto } from './dto/list-maintenance.query.dto';
import { type MaintenanceItemDto } from './dto/maintenance-item.dto';
import { type UpdateMaintenanceDto } from './dto/update-maintenance.dto';
import { MaintenanceRepository, type MaintenanceWithRefs } from './maintenance.repository';

export interface MaintenanceItemView {
  readonly id: string;
  readonly name: string;
  readonly qty: number;
  readonly unitPrice: number;
  readonly totalPrice: number;
}

export interface MaintenanceDto {
  readonly id: string;
  readonly code: string | null;
  readonly vehicleId: number;
  readonly vehiclePlate: string;
  readonly vehicleBrand: string;
  readonly type: MaintenanceType;
  readonly status: MaintenanceStatus;
  readonly date: string;
  readonly odometer: number | null;
  readonly workshop: string | null;
  readonly description: string | null;
  readonly totalCost: number;
  readonly notes: string | null;
  readonly items: MaintenanceItemView[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Each item total is qty × unitPrice; the record total is their sum (server-authoritative). */
function priceItems(items: MaintenanceItemDto[]): {
  rows: Prisma.MaintenanceItemCreateWithoutRecordInput[];
  totalCost: number;
} {
  const rows = items.map((item) => ({
    name: item.name,
    qty: item.qty,
    unitPrice: item.unitPrice,
    totalPrice: item.qty * item.unitPrice,
  }));
  return { rows, totalCost: rows.reduce((sum, r) => sum + r.totalPrice, 0) };
}

function toDto(record: MaintenanceWithRefs): MaintenanceDto {
  return {
    id: record.id.toString(),
    code: record.code,
    vehicleId: record.vehicleId,
    vehiclePlate: record.vehicle.plateNumber,
    vehicleBrand: record.vehicle.model.brand,
    type: record.type,
    status: record.status,
    date: formatDateOnly(record.date),
    odometer: record.odometer,
    workshop: record.workshop,
    description: record.description,
    totalCost: record.totalCost,
    notes: record.notes,
    items: record.items.map((item) => ({
      id: item.id.toString(),
      name: item.name,
      qty: item.qty,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    })),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly repo: MaintenanceRepository,
    private readonly audit: AuditService,
  ) {}

  async list(
    query: ListMaintenanceQueryDto,
  ): Promise<{ data: MaintenanceDto[]; meta: PaginationMeta }> {
    const { rows, total } = await this.repo.list({
      page: query.page,
      limit: query.limit,
      vehicleId: query.vehicleId,
      type: query.type,
      status: query.status,
      from: query.from ? parseDateOnly(query.from) : undefined,
      to: query.to ? parseDateOnly(query.to) : undefined,
    });
    return paginated(rows.map(toDto), total, query);
  }

  async getById(id: string): Promise<MaintenanceDto> {
    const record = await this.repo.findById(this.toBigInt(id));
    if (!record) {
      throw new NotFoundException('Perawatan tidak ditemukan.');
    }
    return toDto(record);
  }

  async create(dto: CreateMaintenanceDto, userId: number): Promise<MaintenanceDto> {
    const vehicle = await this.repo.vehicleExists(dto.vehicleId);
    if (!vehicle) {
      throw new BadRequestException('Kendaraan tidak ditemukan.');
    }
    const { rows, totalCost } = priceItems(dto.items ?? []);
    const code = await this.nextCode(dto.date);

    const record = await this.repo.create({
      code,
      date: parseDateOnly(dto.date),
      type: dto.type,
      totalCost,
      ...(dto.odometer !== undefined ? { odometer: dto.odometer } : {}),
      ...(dto.workshop !== undefined ? { workshop: dto.workshop } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      vehicle: { connect: { id: dto.vehicleId } },
      createdBy: { connect: { id: userId } },
      items: { create: rows },
    });
    return toDto(record);
  }

  async update(id: string, dto: UpdateMaintenanceDto, userId: number): Promise<MaintenanceDto> {
    const existing = await this.repo.findById(this.toBigInt(id));
    if (!existing) {
      throw new NotFoundException('Perawatan tidak ditemukan.');
    }
    if (existing.status === MaintenanceStatus.APPROVED) {
      throw new BadRequestException('Perawatan yang sudah disetujui tidak dapat diubah.');
    }

    const data: Prisma.MaintenanceRecordUpdateInput = {
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.date !== undefined ? { date: parseDateOnly(dto.date) } : {}),
      ...(dto.odometer !== undefined ? { odometer: dto.odometer } : {}),
      ...(dto.workshop !== undefined ? { workshop: dto.workshop } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      updatedBy: { connect: { id: userId } },
    };
    if (dto.items !== undefined) {
      const { rows, totalCost } = priceItems(dto.items);
      data.totalCost = totalCost;
      data.items = { deleteMany: {}, create: rows };
    }

    const record = await this.repo.update(this.toBigInt(id), data);
    return toDto(record);
  }

  async approve(id: string, actor: SessionUser): Promise<MaintenanceDto> {
    const existing = await this.repo.findById(this.toBigInt(id));
    if (!existing) {
      throw new NotFoundException('Perawatan tidak ditemukan.');
    }
    if (existing.status === MaintenanceStatus.APPROVED) {
      throw new BadRequestException('Perawatan sudah disetujui.');
    }
    const record = await this.repo.update(this.toBigInt(id), {
      status: MaintenanceStatus.APPROVED,
      updatedBy: { connect: { id: actor.id } },
    });
    await this.audit.record({
      actor,
      action: 'maintenance.approve',
      entityType: 'MaintenanceRecord',
      entityId: id,
      details: `Menyetujui ${record.code}`,
    });
    return toDto(record);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.repo.findById(this.toBigInt(id));
    if (!existing) {
      throw new NotFoundException('Perawatan tidak ditemukan.');
    }
    if (existing.status === MaintenanceStatus.APPROVED) {
      throw new BadRequestException('Perawatan yang sudah disetujui tidak dapat dihapus.');
    }
    await this.repo.delete(this.toBigInt(id));
  }

  /** Generate `PRW-YYYYMM-NNNN` from the maintenance date + the month's running count. */
  private async nextCode(date: string): Promise<string> {
    const prefix = `PRW-${date.slice(0, 4)}${date.slice(5, 7)}-`;
    const count = await this.repo.countByCodePrefix(prefix);
    return `${prefix}${String(count + 1).padStart(4, '0')}`;
  }

  private toBigInt(id: string): bigint {
    try {
      return BigInt(id);
    } catch {
      throw new BadRequestException('ID perawatan tidak valid.');
    }
  }
}
