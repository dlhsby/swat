import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { formatTimeOnly, parseTimeOnly } from '../../../common/dates';
import { paginated } from '../../../common/pagination';
import { type PaginationMeta } from '../../../common/types/api-response';
import { ActorNamesService } from '../../audit/actor-names.service';

import {
  type CreateScheduleTemplateDto,
  type ListScheduleTemplatesQueryDto,
  type UpdateScheduleTemplateDto,
} from './dto/create-schedule-template.dto';
import {
  ScheduleTemplatesRepository,
  type ScheduleTemplateWithRefs,
} from './schedule-templates.repository';

export interface ScheduleTemplateDto {
  readonly id: string;
  readonly vehicleId: string;
  readonly vehiclePlate: string;
  readonly driverId: string;
  readonly driverName: string;
  readonly departTime: string;
  readonly returnTime: string;
  readonly tripTemplateCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

function toDto(schedule: ScheduleTemplateWithRefs): ScheduleTemplateDto {
  return {
    id: schedule.id,
    vehicleId: schedule.vehicleId,
    vehiclePlate: schedule.vehicle.plateNumber,
    driverId: schedule.driverId,
    driverName: schedule.driver.name,
    departTime: formatTimeOnly(schedule.departTime),
    returnTime: formatTimeOnly(schedule.returnTime),
    tripTemplateCount: schedule._count.tripTemplates,
    createdAt: schedule.createdAt.toISOString(),
    updatedAt: schedule.updatedAt.toISOString(),
  };
}

@Injectable()
export class ScheduleTemplatesService {
  constructor(
    private readonly repo: ScheduleTemplatesRepository,
    private readonly actorNames: ActorNamesService,
  ) {}

  async list(
    query: ListScheduleTemplatesQueryDto,
  ): Promise<{ data: ScheduleTemplateDto[]; meta: PaginationMeta }> {
    const { rows, total } = await this.repo.list({
      page: query.page,
      limit: query.limit,
      vehicleId: query.vehicleId,
      driverId: query.driverId,
    });
    return paginated(await this.actorNames.attach(rows, rows.map(toDto)), total, query);
  }

  async getById(id: string): Promise<ScheduleTemplateDto> {
    const schedule = await this.repo.findById(id);
    if (!schedule) {
      throw new NotFoundException('Jadwal kru tidak ditemukan.');
    }
    return toDto(schedule);
  }

  async create(dto: CreateScheduleTemplateDto): Promise<ScheduleTemplateDto> {
    this.assertTimeOrder(dto.departTime, dto.returnTime);
    await this.assertRefsExist(dto.vehicleId, dto.driverId);
    const duplicate = await this.repo.findByVehicleAndDriver(dto.vehicleId, dto.driverId);
    if (duplicate) {
      throw new ConflictException('Jadwal untuk kendaraan dan pengemudi ini sudah ada.');
    }

    const schedule = await this.repo.create({
      vehicle: { connect: { id: dto.vehicleId } },
      driver: { connect: { id: dto.driverId } },
      departTime: parseTimeOnly(dto.departTime),
      returnTime: parseTimeOnly(dto.returnTime),
    });
    return toDto(schedule);
  }

  async update(id: string, dto: UpdateScheduleTemplateDto): Promise<ScheduleTemplateDto> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException('Jadwal kru tidak ditemukan.');
    }

    const departTime = dto.departTime ?? formatTimeOnly(existing.departTime);
    const returnTime = dto.returnTime ?? formatTimeOnly(existing.returnTime);
    this.assertTimeOrder(departTime, returnTime);

    const vehicleId = dto.vehicleId ?? existing.vehicleId;
    const driverId = dto.driverId ?? existing.driverId;
    if (dto.vehicleId !== undefined || dto.driverId !== undefined) {
      await this.assertRefsExist(vehicleId, driverId);
      const duplicate = await this.repo.findByVehicleAndDriver(vehicleId, driverId);
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException('Jadwal untuk kendaraan dan pengemudi ini sudah ada.');
      }
    }

    const schedule = await this.repo.update(id, {
      ...(dto.vehicleId !== undefined ? { vehicle: { connect: { id: dto.vehicleId } } } : {}),
      ...(dto.driverId !== undefined ? { driver: { connect: { id: dto.driverId } } } : {}),
      ...(dto.departTime !== undefined ? { departTime: parseTimeOnly(dto.departTime) } : {}),
      ...(dto.returnTime !== undefined ? { returnTime: parseTimeOnly(dto.returnTime) } : {}),
    });
    return toDto(schedule);
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.getById(id);
    await this.repo.delete(id);
    return { message: 'Jadwal kru telah dihapus.' };
  }

  private assertTimeOrder(departTime: string, returnTime: string): void {
    if (departTime >= returnTime) {
      throw new BadRequestException('Waktu berangkat harus sebelum waktu kembali.');
    }
  }

  private async assertRefsExist(vehicleId: string, driverId: string): Promise<void> {
    const [vehicle, driver] = await Promise.all([
      this.repo.vehicleExists(vehicleId),
      this.repo.driverExists(driverId),
    ]);
    if (!vehicle) {
      throw new BadRequestException('Kendaraan tidak ditemukan.');
    }
    if (!driver) {
      throw new BadRequestException('Pengemudi tidak ditemukan.');
    }
  }
}
