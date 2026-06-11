import { describe, expect, it } from 'vitest';

import { deriveDayMetrics } from '../dashboard';
import { type TransactionDayDto, type TripDto } from '../types/transactions';

function trip(overrides: Partial<TripDto>): TripDto {
  return {
    id: '1',
    haulAssignmentId: '1',
    routeId: '00000000-0000-0000-0000-000000000001',
    routeCategory: 'PICKUP',
    routeLabel: null,
    name: 'Trip',
    status: 'IN_PROGRESS',
    operationDate: '2026-06-08',
    targetTime: null,
    actualTime: null,
    targetOdometer: 0,
    actualOdometer: 0,
    tareWeight: 0,
    grossWeight: null,
    netWeight: null,
    wasteVolume: null,
    fuelRequestedLiters: null,
    fuelApprovedLiters: null,
    recordedById: null,
    recordedByName: null,
    verifiedById: null,
    verifiedByName: null,
    verifiedAt: null,
    realizationEntryAt: null,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function day(trips: TripDto[], haulStatus = 'IN_PROGRESS'): TransactionDayDto {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    date: '2026-06-08',
    status: 'IN_PROGRESS',
    createdAt: '',
    updatedAt: '',
    hauls: [
      {
        id: '00000000-0000-0000-0000-000000000001',
        vehicleId: '00000000-0000-0000-0000-000000000007',
        vehiclePlate: 'L 1 AB',
        status: haulStatus,
        operationDate: '2026-06-08',
        assignments: [
          {
            id: '00000000-0000-0000-0000-000000000001',
            haulId: '00000000-0000-0000-0000-000000000001',
            driverId: '00000000-0000-0000-0000-000000000003',
            driverName: 'Budi',
            scheduleTemplateId: '00000000-0000-0000-0000-000000000001',
            status: 'IN_PROGRESS',
            operationDate: '2026-06-08',
            departTargetOdometer: 0,
            departActualOdometer: null,
            returnTargetOdometer: 0,
            returnActualOdometer: null,
            departTargetTime: null,
            departActualTime: null,
            returnTargetTime: null,
            returnActualTime: null,
            trips,
            createdAt: '',
            updatedAt: '',
          },
        ],
      },
    ],
  };
}

describe('deriveDayMetrics', () => {
  it('returns zeros for no day', () => {
    expect(deriveDayMetrics(null)).toEqual({
      activeVehicles: 0,
      runningHauls: 0,
      fuelLiters: 0,
      tonnage: 0,
      awaitingVerification: 0,
    });
  });

  it('sums fuel, net tonnage (kg→ton) and counts awaiting-verification', () => {
    const m = deriveDayMetrics(
      day([
        trip({ routeCategory: 'REFUEL', fuelApprovedLiters: 40, status: 'DONE' }),
        trip({ routeCategory: 'DISPOSAL', netWeight: 4250, status: 'DONE' }),
        trip({ routeCategory: 'DISPOSAL', netWeight: 1750, status: 'VERIFIED' }),
      ]),
    );
    expect(m.activeVehicles).toBe(1);
    expect(m.runningHauls).toBe(1);
    expect(m.fuelLiters).toBe(40);
    expect(m.tonnage).toBe(6); // (4250 + 1750) / 1000
    expect(m.awaitingVerification).toBe(2); // two DONE trips
  });

  it('counts a closed haul as not running', () => {
    expect(deriveDayMetrics(day([], 'DONE')).runningHauls).toBe(0);
  });
});
