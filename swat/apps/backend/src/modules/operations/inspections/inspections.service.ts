import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InspectionItemStatus, InspectionResult, type Prisma } from '@prisma/client';

import { formatDateOnly, parseDateOnly } from '../../../common/dates';
import { paginated } from '../../../common/pagination';
import { type PaginationMeta } from '../../../common/types/api-response';

import { type CreateInspectionDto } from './dto/create-inspection.dto';
import { type InspectionItemDto } from './dto/inspection-item.dto';
import { type ListInspectionsQueryDto } from './dto/list-inspections.query.dto';
import { type UpdateInspectionDto } from './dto/update-inspection.dto';
import { INSPECTION_CHECKLIST } from './inspection.constants';
import { InspectionsRepository, type InspectionWithRefs } from './inspections.repository';

export interface InspectionItemView {
  readonly id: string;
  readonly label: string;
  readonly status: InspectionItemStatus;
  readonly notes: string | null;
}

export interface InspectionDto {
  readonly id: string;
  readonly vehicleId: number;
  readonly vehiclePlate: string;
  readonly vehicleBrand: string;
  readonly date: string;
  readonly inspectorId: number | null;
  readonly inspectorName: string | null;
  readonly result: InspectionResult;
  readonly passedCount: number;
  readonly totalCount: number;
  readonly notes: string | null;
  readonly items: InspectionItemView[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface DerivedResult {
  readonly result: InspectionResult;
  readonly passedCount: number;
  readonly totalCount: number;
}

/**
 * Server-authoritative result derivation: any FAIL → FAIL; else any ATTENTION →
 * ATTENTION; else PASS. `passedCount` = items with status OK.
 */
export function deriveInspectionResult(
  items: ReadonlyArray<{ status: InspectionItemStatus }>,
): DerivedResult {
  const hasFail = items.some((i) => i.status === InspectionItemStatus.FAIL);
  const hasAttention = items.some((i) => i.status === InspectionItemStatus.ATTENTION);
  const result = hasFail
    ? InspectionResult.FAIL
    : hasAttention
      ? InspectionResult.ATTENTION
      : InspectionResult.PASS;
  return {
    result,
    passedCount: items.filter((i) => i.status === InspectionItemStatus.OK).length,
    totalCount: items.length,
  };
}

/** When no items are supplied, materialize the default 12-item template (all OK). */
function resolveItems(items: InspectionItemDto[] | undefined): InspectionItemDto[] {
  if (items && items.length > 0) {
    return items;
  }
  return INSPECTION_CHECKLIST.map((label) => ({ label, status: InspectionItemStatus.OK }));
}

function toDto(inspection: InspectionWithRefs): InspectionDto {
  return {
    id: inspection.id.toString(),
    vehicleId: inspection.vehicleId,
    vehiclePlate: inspection.vehicle.plateNumber,
    vehicleBrand: inspection.vehicle.model.brand,
    date: formatDateOnly(inspection.date),
    inspectorId: inspection.inspectorId,
    inspectorName: inspection.inspector?.name ?? null,
    result: inspection.result,
    passedCount: inspection.passedCount,
    totalCount: inspection.totalCount,
    notes: inspection.notes,
    items: inspection.items.map((item) => ({
      id: item.id.toString(),
      label: item.label,
      status: item.status,
      notes: item.notes,
    })),
    createdAt: inspection.createdAt.toISOString(),
    updatedAt: inspection.updatedAt.toISOString(),
  };
}

@Injectable()
export class InspectionsService {
  constructor(private readonly repo: InspectionsRepository) {}

  async list(
    query: ListInspectionsQueryDto,
  ): Promise<{ data: InspectionDto[]; meta: PaginationMeta }> {
    const { rows, total } = await this.repo.list({
      page: query.page,
      limit: query.limit,
      vehicleId: query.vehicleId,
      result: query.result,
      date: query.date ? parseDateOnly(query.date) : undefined,
    });
    return paginated(rows.map(toDto), total, query);
  }

  async getById(id: string): Promise<InspectionDto> {
    const inspection = await this.repo.findById(this.toBigInt(id));
    if (!inspection) {
      throw new NotFoundException('Pemeriksaan tidak ditemukan.');
    }
    return toDto(inspection);
  }

  async create(dto: CreateInspectionDto, userId: number): Promise<InspectionDto> {
    const vehicle = await this.repo.vehicleExists(dto.vehicleId);
    if (!vehicle) {
      throw new BadRequestException('Kendaraan tidak ditemukan.');
    }
    const items = resolveItems(dto.items);
    const derived = deriveInspectionResult(items);

    const inspection = await this.repo.create({
      date: parseDateOnly(dto.date),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      result: derived.result,
      passedCount: derived.passedCount,
      totalCount: derived.totalCount,
      vehicle: { connect: { id: dto.vehicleId } },
      ...(dto.inspectorId !== undefined ? { inspector: { connect: { id: dto.inspectorId } } } : {}),
      createdBy: { connect: { id: userId } },
      items: { create: items.map(toItemCreate) },
    });
    return toDto(inspection);
  }

  async update(id: string, dto: UpdateInspectionDto): Promise<InspectionDto> {
    const existing = await this.repo.findById(this.toBigInt(id));
    if (!existing) {
      throw new NotFoundException('Pemeriksaan tidak ditemukan.');
    }

    const data: Prisma.VehicleInspectionUpdateInput = {
      ...(dto.date !== undefined ? { date: parseDateOnly(dto.date) } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      ...(dto.inspectorId !== undefined ? { inspector: { connect: { id: dto.inspectorId } } } : {}),
    };

    // Replacing the checklist re-derives the result + counts server-side.
    if (dto.items !== undefined) {
      const items = resolveItems(dto.items);
      const derived = deriveInspectionResult(items);
      data.result = derived.result;
      data.passedCount = derived.passedCount;
      data.totalCount = derived.totalCount;
      data.items = { deleteMany: {}, create: items.map(toItemCreate) };
    }

    const inspection = await this.repo.update(this.toBigInt(id), data);
    return toDto(inspection);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.repo.findById(this.toBigInt(id));
    if (!existing) {
      throw new NotFoundException('Pemeriksaan tidak ditemukan.');
    }
    await this.repo.delete(this.toBigInt(id));
  }

  private toBigInt(id: string): bigint {
    try {
      return BigInt(id);
    } catch {
      throw new BadRequestException('ID pemeriksaan tidak valid.');
    }
  }
}

function toItemCreate(item: InspectionItemDto): Prisma.InspectionItemCreateWithoutInspectionInput {
  return {
    label: item.label,
    status: item.status,
    ...(item.notes !== undefined ? { notes: item.notes } : {}),
  };
}
