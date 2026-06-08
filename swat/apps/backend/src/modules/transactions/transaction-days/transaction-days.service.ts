import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type DayStatus } from '@prisma/client';

import { parseDateOnly } from '../../../common/dates';
import { type DailyInitResult, DailyInitService } from '../daily-init/daily-init.service';
import {
  type HaulAssignmentDto,
  toHaulAssignmentDto,
} from '../haul-assignments/haul-assignment.mapper';

import {
  TransactionDaysRepository,
  type TransactionDayWithTree,
} from './transaction-days.repository';

export interface HaulDto {
  readonly id: string;
  readonly vehicleId: number;
  readonly vehiclePlate: string;
  readonly status: string;
  readonly operationDate: string;
  readonly assignments: HaulAssignmentDto[];
}

export interface TransactionDayDto {
  readonly id: number;
  readonly date: string;
  readonly status: string;
  readonly hauls: HaulDto[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

function toDto(day: TransactionDayWithTree): TransactionDayDto {
  return {
    id: day.id,
    date: day.date.toISOString().slice(0, 10),
    status: day.status,
    hauls: day.hauls.map((haul) => ({
      id: haul.id.toString(),
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

  async getById(id: number): Promise<TransactionDayDto> {
    const day = await this.repo.findById(id);
    if (!day) {
      throw new NotFoundException('Hari transaksi tidak ditemukan.');
    }
    return toDto(day);
  }

  async getByDate(date: string): Promise<TransactionDayDto> {
    const day = await this.repo.findByDate(parseDateOnly(date));
    if (!day) {
      throw new NotFoundException('Hari transaksi tidak ditemukan.');
    }
    return toDto(day);
  }

  async updateStatus(id: number, status: DayStatus): Promise<TransactionDayDto> {
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
