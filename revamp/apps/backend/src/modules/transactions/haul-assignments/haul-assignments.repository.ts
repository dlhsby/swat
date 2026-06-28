import { Injectable } from '@nestjs/common';
import { type Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { tripInclude, type TripWithRefs } from '../trips/trip.mapper';

import { haulAssignmentInclude, type HaulAssignmentWithRefs } from './haul-assignment.mapper';

const recordingInclude = {
  ...haulAssignmentInclude,
  haul: {
    select: {
      id: true,
      status: true,
      vehicleId: true,
      vehicle: { select: { id: true, currentOdometer: true } },
      assignments: { select: { id: true, status: true } },
    },
  },
} satisfies Prisma.HaulAssignmentInclude;

export type HaulAssignmentForRecording = Prisma.HaulAssignmentGetPayload<{
  include: typeof recordingInclude;
}>;

@Injectable()
export class HaulAssignmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findForRecording(id: string): Promise<HaulAssignmentForRecording | null> {
    return this.prisma.haulAssignment.findUnique({ where: { id }, include: recordingInclude });
  }

  /** Record departure; no cascade. */
  recordDepart(
    id: string,
    data: Prisma.HaulAssignmentUpdateInput,
  ): Promise<HaulAssignmentWithRefs> {
    return this.prisma.haulAssignment.update({
      where: { id },
      data,
      include: haulAssignmentInclude,
    });
  }

  /**
   * Record return atomically: advance the vehicle odometer, close the
   * assignment, and close the parent haul when every assignment is done.
   */
  async recordReturn(params: {
    id: string;
    haulId: string;
    vehicleId: string;
    odometer: number;
    data: Prisma.HaulAssignmentUpdateInput;
    closeHaul: boolean;
  }): Promise<HaulAssignmentWithRefs> {
    const [, assignment] = await this.prisma.$transaction([
      this.prisma.vehicle.update({
        where: { id: params.vehicleId },
        data: { currentOdometer: params.odometer },
        select: { id: true },
      }),
      this.prisma.haulAssignment.update({
        where: { id: params.id },
        data: params.data,
        include: haulAssignmentInclude,
      }),
      ...(params.closeHaul
        ? [
            this.prisma.haul.update({
              where: { id: params.haulId },
              data: { status: 'DONE' },
              select: { id: true },
            }),
          ]
        : []),
    ]);
    return assignment;
  }

  listTrips(haulAssignmentId: string): Promise<TripWithRefs[]> {
    return this.prisma.trip.findMany({
      where: { haulAssignmentId },
      include: tripInclude,
      orderBy: { targetTime: 'asc' },
    });
  }

  // --- Add shift / add vehicle (Phase 7.8, T-729) --------------------------

  findHaul(haulId: string): Promise<{
    id: string;
    status: string;
    operationDate: Date;
    vehicle: { currentOdometer: number };
  } | null> {
    return this.prisma.haul.findUnique({
      where: { id: haulId },
      select: {
        id: true,
        status: true,
        operationDate: true,
        vehicle: { select: { currentOdometer: true } },
      },
    });
  }

  findDay(dayId: string): Promise<{ id: string; date: Date; status: string } | null> {
    return this.prisma.transactionDay.findUnique({
      where: { id: dayId },
      select: { id: true, date: true, status: true },
    });
  }

  findVehicle(vehicleId: string): Promise<{ id: string; currentOdometer: number } | null> {
    return this.prisma.vehicle.findFirst({
      where: { id: vehicleId, deletedAt: null },
      select: { id: true, currentOdometer: true },
    });
  }

  driverExists(driverId: string): Promise<boolean> {
    return this.prisma.driver
      .findFirst({ where: { id: driverId, deletedAt: null }, select: { id: true } })
      .then((d) => d !== null);
  }

  haulExistsForVehicle(transactionDayId: string, vehicleId: string): Promise<boolean> {
    return this.prisma.haul
      .findFirst({ where: { transactionDayId, vehicleId }, select: { id: true } })
      .then((h) => h !== null);
  }

  createAssignment(
    data: Prisma.HaulAssignmentUncheckedCreateInput,
  ): Promise<HaulAssignmentWithRefs> {
    return this.prisma.haulAssignment.create({ data, include: haulAssignmentInclude });
  }

  /** Create a vehicle's haul + its first shift atomically. */
  createHaulWithAssignment(
    haul: Prisma.HaulUncheckedCreateInput,
    assignment: Omit<Prisma.HaulAssignmentUncheckedCreateInput, 'haulId'>,
  ): Promise<HaulAssignmentWithRefs> {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.haul.create({ data: haul, select: { id: true } });
      return tx.haulAssignment.create({
        data: { ...assignment, haulId: created.id },
        include: haulAssignmentInclude,
      });
    });
  }
}
