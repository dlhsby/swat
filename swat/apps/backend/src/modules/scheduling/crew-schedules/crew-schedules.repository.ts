import { Injectable } from '@nestjs/common';
import { type Prisma } from '@prisma/client';

import { toSkipTake, type PageParams } from '../../../common/pagination';
import { PrismaService } from '../../prisma/prisma.service';

const crewInclude = {
  vehicle: { select: { id: true, plateNumber: true } },
  driver: { select: { id: true, name: true } },
  _count: { select: { tripTemplates: true } },
} satisfies Prisma.CrewScheduleInclude;

export type CrewScheduleWithRefs = Prisma.CrewScheduleGetPayload<{ include: typeof crewInclude }>;

export interface ListCrewSchedulesFilter extends PageParams {
  readonly vehicleId?: string;
  readonly driverId?: string;
}

@Injectable()
export class CrewSchedulesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private listWhere(filter: ListCrewSchedulesFilter): Prisma.CrewScheduleWhereInput {
    return {
      ...(filter.vehicleId ? { vehicleId: filter.vehicleId } : {}),
      ...(filter.driverId ? { driverId: filter.driverId } : {}),
    };
  }

  async list(
    filter: ListCrewSchedulesFilter,
  ): Promise<{ rows: CrewScheduleWithRefs[]; total: number }> {
    const where = this.listWhere(filter);
    const { skip, take } = toSkipTake(filter);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.crewSchedule.findMany({
        where,
        include: crewInclude,
        orderBy: { id: 'asc' },
        skip,
        take,
      }),
      this.prisma.crewSchedule.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: string): Promise<CrewScheduleWithRefs | null> {
    return this.prisma.crewSchedule.findUnique({ where: { id }, include: crewInclude });
  }

  findByVehicleAndDriver(vehicleId: string, driverId: string): Promise<{ id: string } | null> {
    return this.prisma.crewSchedule.findUnique({
      where: { vehicleId_driverId: { vehicleId, driverId } },
      select: { id: true },
    });
  }

  vehicleExists(id: string): Promise<{ id: string } | null> {
    return this.prisma.vehicle.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  }

  driverExists(id: string): Promise<{ id: string } | null> {
    return this.prisma.driver.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  }

  create(data: Prisma.CrewScheduleCreateInput): Promise<CrewScheduleWithRefs> {
    return this.prisma.crewSchedule.create({ data, include: crewInclude });
  }

  update(id: string, data: Prisma.CrewScheduleUpdateInput): Promise<CrewScheduleWithRefs> {
    return this.prisma.crewSchedule.update({ where: { id }, data, include: crewInclude });
  }

  delete(id: string): Promise<{ id: string }> {
    return this.prisma.crewSchedule.delete({ where: { id }, select: { id: true } });
  }
}
