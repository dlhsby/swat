import { Injectable } from '@nestjs/common';
import { RouteCategory, type Prisma, type TripStatus } from '@prisma/client';

import { toSkipTake, type PageParams } from '../../../common/pagination';
import { PrismaService } from '../../prisma/prisma.service';

const refuelInclude = {
  route: { select: { category: true } },
  recordedBy: { select: { id: true, name: true } },
  haulAssignment: {
    select: {
      haul: {
        select: {
          vehicleId: true,
          vehicle: {
            select: {
              id: true,
              plateNumber: true,
              model: {
                select: { fuel: { select: { id: true, name: true, pricePerLiter: true } } },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.TripInclude;

export type RefuelTrip = Prisma.TripGetPayload<{ include: typeof refuelInclude }>;

export interface ListRefuelsFilter extends PageParams {
  readonly vehicleId?: number;
  readonly fuelId?: number;
  readonly status?: TripStatus;
  readonly date?: Date;
}

@Injectable()
export class RefuelsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private listWhere(filter: ListRefuelsFilter): Prisma.TripWhereInput {
    return {
      route: { category: RouteCategory.REFUEL },
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.date ? { operationDate: filter.date } : {}),
      ...(filter.vehicleId || filter.fuelId
        ? {
            haulAssignment: {
              haul: {
                ...(filter.vehicleId ? { vehicleId: filter.vehicleId } : {}),
                ...(filter.fuelId ? { vehicle: { model: { fuelId: filter.fuelId } } } : {}),
              },
            },
          }
        : {}),
    };
  }

  async list(filter: ListRefuelsFilter): Promise<{ rows: RefuelTrip[]; total: number }> {
    const where = this.listWhere(filter);
    const { skip, take } = toSkipTake(filter);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.trip.findMany({
        where,
        include: refuelInclude,
        orderBy: [{ operationDate: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      this.prisma.trip.count({ where }),
    ]);
    return { rows, total };
  }
}
