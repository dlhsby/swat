import { Injectable } from '@nestjs/common';
import { type Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

const permitWithRefs = {
  vehicle: { include: { model: true } },
  site: true,
} satisfies Prisma.DisposalPermitInclude;

export type PermitWithVehicleAndSite = Prisma.DisposalPermitGetPayload<{
  include: typeof permitWithRefs;
}>;

/**
 * Read access for weighbridge kitir resolution (Phase 4). Finds the ACTIVE
 * {@link PermitWithVehicleAndSite} valid on a given date — by code, or by plate
 * scoped to TPA sites — including the vehicle model needed for tare/capacity.
 */
@Injectable()
export class WeighbridgeRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActivePermitByCode(code: string, date: Date): Promise<PermitWithVehicleAndSite | null> {
    return this.prisma.disposalPermit.findFirst({
      where: {
        code,
        status: 'ACTIVE',
        validFrom: { lte: date },
        validTo: { gte: date },
      },
      include: permitWithRefs,
    });
  }

  async findActivePermitByPlate(
    plateNumber: string,
    date: Date,
  ): Promise<PermitWithVehicleAndSite | null> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { plateNumber, deletedAt: null },
      select: { id: true },
    });
    if (!vehicle) {
      return null;
    }
    return this.prisma.disposalPermit.findFirst({
      where: {
        vehicleId: vehicle.id,
        site: { type: 'TPA' },
        status: 'ACTIVE',
        validFrom: { lte: date },
        validTo: { gte: date },
      },
      include: permitWithRefs,
    });
  }

  findActivePermitById(id: string, date: Date): Promise<PermitWithVehicleAndSite | null> {
    return this.prisma.disposalPermit.findFirst({
      where: {
        id,
        status: 'ACTIVE',
        validFrom: { lte: date },
        validTo: { gte: date },
      },
      include: permitWithRefs,
    });
  }
}
