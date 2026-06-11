import { Injectable } from '@nestjs/common';
import { type Prisma } from '@prisma/client';

import { toSkipTake, type PageParams } from '../../../common/pagination';
import { PrismaService } from '../../prisma/prisma.service';

const crewInclude = {
  vehicle: { select: { id: true, plateNumber: true } },
  driver: { select: { id: true, name: true } },
  _count: { select: { tripTemplates: true } },
} satisfies Prisma.ScheduleTemplateInclude;

export type ScheduleTemplateWithRefs = Prisma.ScheduleTemplateGetPayload<{
  include: typeof crewInclude;
}>;

export interface ListScheduleTemplatesFilter extends PageParams {
  readonly vehicleId?: string;
  readonly driverId?: string;
}

@Injectable()
export class ScheduleTemplatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private listWhere(filter: ListScheduleTemplatesFilter): Prisma.ScheduleTemplateWhereInput {
    return {
      ...(filter.vehicleId ? { vehicleId: filter.vehicleId } : {}),
      ...(filter.driverId ? { driverId: filter.driverId } : {}),
    };
  }

  async list(
    filter: ListScheduleTemplatesFilter,
  ): Promise<{ rows: ScheduleTemplateWithRefs[]; total: number }> {
    const where = this.listWhere(filter);
    const { skip, take } = toSkipTake(filter);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.scheduleTemplate.findMany({
        where,
        include: crewInclude,
        orderBy: { id: 'asc' },
        skip,
        take,
      }),
      this.prisma.scheduleTemplate.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: string): Promise<ScheduleTemplateWithRefs | null> {
    return this.prisma.scheduleTemplate.findUnique({ where: { id }, include: crewInclude });
  }

  /**
   * Any schedule template for this (vehicle, driver) pair — including a soft-deleted
   * one. The `@@unique([vehicleId, driverId])` constraint ignores `deletedAt`, so the
   * service must see a soft-deleted row to resurrect it instead of hitting the DB
   * constraint. Passing a `deletedAt` clause opts out of the middleware's
   * `deletedAt: null` injection.
   */
  findAnyByVehicleAndDriver(
    vehicleId: string,
    driverId: string,
  ): Promise<{ id: string; deletedAt: Date | null } | null> {
    return this.prisma.scheduleTemplate.findFirst({
      where: { vehicleId, driverId, deletedAt: { not: undefined } },
      select: { id: true, deletedAt: true },
    });
  }

  vehicleExists(id: string): Promise<{ id: string } | null> {
    return this.prisma.vehicle.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  }

  driverExists(id: string): Promise<{ id: string } | null> {
    return this.prisma.driver.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  }

  create(data: Prisma.ScheduleTemplateCreateInput): Promise<ScheduleTemplateWithRefs> {
    return this.prisma.scheduleTemplate.create({ data, include: crewInclude });
  }

  update(id: string, data: Prisma.ScheduleTemplateUpdateInput): Promise<ScheduleTemplateWithRefs> {
    return this.prisma.scheduleTemplate.update({ where: { id }, data, include: crewInclude });
  }

  delete(id: string): Promise<{ id: string }> {
    return this.prisma.scheduleTemplate.delete({ where: { id }, select: { id: true } });
  }
}
