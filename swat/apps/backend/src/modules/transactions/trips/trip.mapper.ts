import { type Prisma } from '@prisma/client';

/** Relations every trip DTO needs. Shared so the read tree and the trip
 *  endpoints serialize trips identically. */
export const tripInclude = {
  route: {
    select: {
      id: true,
      category: true,
      originSite: { select: { name: true } },
      destinationSite: { select: { name: true } },
    },
  },
  recordedBy: { select: { id: true, name: true } },
  verifiedBy: { select: { id: true, name: true } },
} satisfies Prisma.TripInclude;

export type TripWithRefs = Prisma.TripGetPayload<{ include: typeof tripInclude }>;

export interface TripDto {
  readonly id: string;
  readonly haulAssignmentId: string;
  readonly routeId: string | null;
  readonly routeCategory: string | null;
  readonly routeLabel: string | null;
  readonly name: string;
  readonly status: string;
  readonly operationDate: string;
  readonly targetTime: string | null;
  readonly actualTime: string | null;
  readonly targetOdometer: number;
  readonly actualOdometer: number;
  readonly tareWeight: number;
  readonly grossWeight: number | null;
  readonly netWeight: number | null;
  readonly wasteVolume: number | null;
  readonly fuelRequestedLiters: number | null;
  readonly fuelApprovedLiters: number | null;
  readonly recordedById: string | null;
  readonly recordedByName: string | null;
  readonly verifiedById: string | null;
  readonly verifiedByName: string | null;
  readonly verifiedAt: string | null;
  readonly realizationEntryAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

const decimalToNumber = (value: Prisma.Decimal | null): number | null =>
  value === null ? null : Number(value);

export function toTripDto(trip: TripWithRefs): TripDto {
  return {
    id: trip.id,
    haulAssignmentId: trip.haulAssignmentId,
    routeId: trip.routeId,
    routeCategory: trip.route?.category ?? null,
    routeLabel: trip.route
      ? `${trip.route.originSite.name} → ${trip.route.destinationSite.name}`
      : null,
    name: trip.name,
    status: trip.status,
    operationDate: trip.operationDate.toISOString().slice(0, 10),
    targetTime: trip.targetTime?.toISOString() ?? null,
    actualTime: trip.actualTime?.toISOString() ?? null,
    targetOdometer: trip.targetOdometer,
    actualOdometer: trip.actualOdometer,
    tareWeight: trip.tareWeight,
    grossWeight: trip.grossWeight,
    netWeight: trip.netWeight,
    wasteVolume: trip.wasteVolume,
    fuelRequestedLiters: decimalToNumber(trip.fuelRequestedLiters),
    fuelApprovedLiters: decimalToNumber(trip.fuelApprovedLiters),
    recordedById: trip.recordedById,
    recordedByName: trip.recordedBy?.name ?? null,
    verifiedById: trip.verifiedById,
    verifiedByName: trip.verifiedBy?.name ?? null,
    verifiedAt: trip.verifiedAt?.toISOString() ?? null,
    realizationEntryAt: trip.realizationEntryAt?.toISOString() ?? null,
    createdAt: trip.createdAt.toISOString(),
    updatedAt: trip.updatedAt.toISOString(),
  };
}
