import { Injectable } from '@nestjs/common';
import { type Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

import { tripInclude, type TripWithRefs } from './trip.mapper';

const recordingInclude = {
  ...tripInclude,
  haulAssignment: {
    select: {
      id: true,
      departActualOdometer: true,
      haul: {
        select: {
          vehicleId: true,
          vehicle: { select: { currentTareWeight: true, currentOdometer: true } },
        },
      },
      trips: { select: { id: true, status: true, actualOdometer: true, targetTime: true } },
    },
  },
} satisfies Prisma.TripInclude;

export type TripForRecording = Prisma.TripGetPayload<{ include: typeof recordingInclude }>;

const fullInclude = {
  ...tripInclude,
  haulAssignment: {
    include: {
      driver: { select: { id: true, name: true } },
      haul: {
        include: {
          vehicle: { select: { id: true, plateNumber: true } },
          transactionDay: { select: { id: true, date: true, status: true } },
        },
      },
    },
  },
} satisfies Prisma.TripInclude;

export type TripFull = Prisma.TripGetPayload<{ include: typeof fullInclude }>;

@Injectable()
export class TripsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findForRecording(id: bigint): Promise<TripForRecording | null> {
    return this.prisma.trip.findUnique({ where: { id }, include: recordingInclude });
  }

  findFull(id: bigint): Promise<TripFull | null> {
    return this.prisma.trip.findUnique({ where: { id }, include: fullInclude });
  }

  update(id: bigint, data: Prisma.TripUpdateInput): Promise<TripWithRefs> {
    return this.prisma.trip.update({ where: { id }, data, include: tripInclude });
  }
}
