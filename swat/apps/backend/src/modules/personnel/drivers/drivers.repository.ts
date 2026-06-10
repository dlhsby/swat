import { Injectable } from '@nestjs/common';
import { type Prisma, type EmploymentStatus } from '@prisma/client';

import { toSkipTake, type PageParams } from '../../../common/pagination';
import { PrismaService } from '../../prisma/prisma.service';

const driverInclude = {
  poolSite: { select: { id: true, name: true } },
} satisfies Prisma.DriverInclude;

export type DriverWithPool = Prisma.DriverGetPayload<{ include: typeof driverInclude }>;

export interface ListDriversFilter extends PageParams {
  readonly poolSiteId?: string;
  readonly employmentStatus?: EmploymentStatus;
  readonly search?: string;
}

@Injectable()
export class DriversRepository {
  constructor(private readonly prisma: PrismaService) {}

  private listWhere(filter: ListDriversFilter): Prisma.DriverWhereInput {
    return {
      deletedAt: null,
      ...(filter.poolSiteId ? { poolSiteId: filter.poolSiteId } : {}),
      ...(filter.employmentStatus ? { employmentStatus: filter.employmentStatus } : {}),
      ...(filter.search
        ? {
            OR: [
              { name: { contains: filter.search, mode: 'insensitive' } },
              { idCardNumber: { contains: filter.search } },
            ],
          }
        : {}),
    };
  }

  async list(filter: ListDriversFilter): Promise<{ rows: DriverWithPool[]; total: number }> {
    const where = this.listWhere(filter);
    const { skip, take } = toSkipTake(filter);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.driver.findMany({
        where,
        include: driverInclude,
        orderBy: { name: 'asc' },
        skip,
        take,
      }),
      this.prisma.driver.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: string): Promise<DriverWithPool | null> {
    return this.prisma.driver.findFirst({ where: { id, deletedAt: null }, include: driverInclude });
  }

  findByIdCard(idCardNumber: string): Promise<{ id: string } | null> {
    return this.prisma.driver.findFirst({
      where: { idCardNumber, deletedAt: null },
      select: { id: true },
    });
  }

  siteExists(id: string): Promise<{ id: string } | null> {
    return this.prisma.site.findFirst({ where: { id, deletedAt: null }, select: { id: true } });
  }

  create(data: Prisma.DriverCreateInput): Promise<DriverWithPool> {
    return this.prisma.driver.create({ data, include: driverInclude });
  }

  update(id: string, data: Prisma.DriverUpdateInput): Promise<DriverWithPool> {
    return this.prisma.driver.update({ where: { id }, data, include: driverInclude });
  }

  softDelete(id: string): Promise<{ id: string }> {
    return this.prisma.driver.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    });
  }
}
