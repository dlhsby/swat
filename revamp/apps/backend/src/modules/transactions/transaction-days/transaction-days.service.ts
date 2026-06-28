import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type DayStatus } from '@prisma/client';

import { formatDateOnly, parseDateOnly } from '../../../common/dates';
import { paginated } from '../../../common/pagination';
import { type PaginationMeta } from '../../../common/types/api-response';
import { type DailyInitResult, DailyInitService } from '../daily-init/daily-init.service';
import {
  type HaulAssignmentDto,
  toHaulAssignmentDto,
} from '../haul-assignments/haul-assignment.mapper';

import { type ListTransactionDaysQueryDto } from './dto/list-transaction-days.query.dto';
import {
  TransactionDaysRepository,
  type TransactionDayWithTree,
} from './transaction-days.repository';

export interface HaulDto {
  readonly id: string;
  readonly vehicleId: string;
  readonly vehiclePlate: string;
  readonly status: string;
  readonly operationDate: string;
  readonly assignments: HaulAssignmentDto[];
}

export interface TransactionDayDto {
  readonly id: string;
  readonly date: string;
  readonly status: string;
  readonly hauls: HaulDto[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Row shape for the paginated transaction-days list (no haul/trip tree). */
export interface TransactionDaySummaryDto {
  readonly id: string;
  readonly date: string;
  readonly status: string;
  readonly vehicleCount: number;
  readonly tonnageKg: number;
}

function toDto(day: TransactionDayWithTree): TransactionDayDto {
  return {
    id: day.id,
    date: day.date.toISOString().slice(0, 10),
    status: day.status,
    hauls: day.hauls.map((haul) => ({
      id: haul.id,
      vehicleId: haul.vehicleId,
      vehiclePlate: haul.vehicle.plateNumber,
      status: haul.status,
      operationDate: haul.operationDate.toISOString().slice(0, 10),
      assignments: haul.assignments.map(toHaulAssignmentDto),
    })),
    createdAt: day.createdAt.toISOString(),
    updatedAt: day.updatedAt.toISOString(),
  };
}

@Injectable()
export class TransactionDaysService {
  constructor(
    private readonly repo: TransactionDaysRepository,
    private readonly dailyInit: DailyInitService,
  ) {}

  async list(
    query: ListTransactionDaysQueryDto,
  ): Promise<{ data: TransactionDaySummaryDto[]; meta: PaginationMeta }> {
    const { rows, total } = await this.repo.listSummaries({
      page: query.page,
      limit: query.limit,
      status: query.status,
    });
    const data = rows.map((r) => ({
      id: r.id,
      date: formatDateOnly(r.date),
      status: r.status,
      vehicleCount: r.vehicleCount,
      tonnageKg: r.tonnageKg,
    }));
    return paginated(data, total, query);
  }

  async getById(id: string): Promise<TransactionDayDto> {
    const day = await this.repo.findById(id);
    if (!day) {
      throw new NotFoundException('Hari transaksi tidak ditemukan.');
    }
    return this.withCctv(toDto(day));
  }

  async getByDate(date: string): Promise<TransactionDayDto> {
    const day = await this.repo.findByDate(parseDateOnly(date));
    if (!day) {
      throw new NotFoundException('Hari transaksi tidak ditemukan.');
    }
    return this.withCctv(toDto(day));
  }

  /** Fill each trip's `cctvReference` from the TPA weighbridge log (disposal only). */
  private async withCctv(dto: TransactionDayDto): Promise<TransactionDayDto> {
    const tripIds = dto.hauls.flatMap((h) =>
      h.assignments.flatMap((a) => a.trips.map((t) => t.id)),
    );
    const logs = await this.repo.cctvByTripIds(tripIds);
    if (logs.length === 0) {
      return dto;
    }
    const byTrip = new Map(logs.map((l) => [l.tripId, l.cctvReference]));
    return {
      ...dto,
      hauls: dto.hauls.map((haul) => ({
        ...haul,
        assignments: haul.assignments.map((assignment) => ({
          ...assignment,
          trips: assignment.trips.map((trip) =>
            byTrip.has(trip.id) ? { ...trip, cctvReference: byTrip.get(trip.id) ?? null } : trip,
          ),
        })),
      })),
    };
  }

  async updateStatus(id: string, status: DayStatus): Promise<TransactionDayDto> {
    await this.getById(id);
    if (status === 'DONE') {
      const open = await this.repo.countOpenHauls(id);
      if (open > 0) {
        throw new BadRequestException(
          'Hari transaksi belum dapat diselesaikan: masih ada haul yang berjalan.',
        );
      }
    }
    const updated = await this.repo.updateStatus(id, status);
    return toDto(updated);
  }

  /** Manual trigger for the daily-init job (testing / recovery). */
  initializeToday(): Promise<DailyInitResult> {
    return this.dailyInit.handleManualToday();
  }
}
