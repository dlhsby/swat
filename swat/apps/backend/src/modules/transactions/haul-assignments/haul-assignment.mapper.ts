import { type Prisma } from '@prisma/client';

import { type TripDto, tripInclude, toTripDto } from '../trips/trip.mapper';

export const haulAssignmentInclude = {
  driver: { select: { id: true, name: true } },
  trips: { include: tripInclude, orderBy: { targetTime: 'asc' } },
} satisfies Prisma.HaulAssignmentInclude;

export type HaulAssignmentWithRefs = Prisma.HaulAssignmentGetPayload<{
  include: typeof haulAssignmentInclude;
}>;

export interface HaulAssignmentDto {
  readonly id: string;
  readonly haulId: string;
  readonly driverId: number;
  readonly driverName: string;
  readonly crewScheduleId: number | null;
  readonly status: string;
  readonly operationDate: string;
  readonly departTargetOdometer: number;
  readonly departActualOdometer: number | null;
  readonly returnTargetOdometer: number;
  readonly returnActualOdometer: number | null;
  readonly departTargetTime: string | null;
  readonly departActualTime: string | null;
  readonly returnTargetTime: string | null;
  readonly returnActualTime: string | null;
  readonly trips: TripDto[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function toHaulAssignmentDto(assignment: HaulAssignmentWithRefs): HaulAssignmentDto {
  return {
    id: assignment.id.toString(),
    haulId: assignment.haulId.toString(),
    driverId: assignment.driverId,
    driverName: assignment.driver.name,
    crewScheduleId: assignment.crewScheduleId,
    status: assignment.status,
    operationDate: assignment.operationDate.toISOString().slice(0, 10),
    departTargetOdometer: assignment.departTargetOdometer,
    departActualOdometer: assignment.departActualOdometer,
    returnTargetOdometer: assignment.returnTargetOdometer,
    returnActualOdometer: assignment.returnActualOdometer,
    departTargetTime: assignment.departTargetTime?.toISOString() ?? null,
    departActualTime: assignment.departActualTime?.toISOString() ?? null,
    returnTargetTime: assignment.returnTargetTime?.toISOString() ?? null,
    returnActualTime: assignment.returnActualTime?.toISOString() ?? null,
    trips: assignment.trips.map(toTripDto),
    createdAt: assignment.createdAt.toISOString(),
    updatedAt: assignment.updatedAt.toISOString(),
  };
}
