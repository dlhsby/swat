import { parseDateOnly } from '../../../common/dates';
import { type PrismaService } from '../../prisma/prisma.service';

import { DailyInitService } from './daily-init.service';

function buildSchedule(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    vehicleId: 7,
    driverId: 3,
    departTime: new Date('1970-01-01T05:00:00Z'),
    returnTime: new Date('1970-01-01T14:00:00Z'),
    vehicle: { id: 7, currentOdometer: 12000 },
    tripTemplates: [
      {
        id: 1,
        routeId: 4,
        targetTime: new Date('1970-01-01T06:00:00Z'),
        fuelRequestedLiters: null,
        route: {
          id: 4,
          category: 'DISPOSAL',
          originSite: { name: 'TPS A' },
          destinationSite: { name: 'TPA B' },
        },
      },
    ],
    ...overrides,
  };
}

describe('DailyInitService', () => {
  const date = parseDateOnly('2026-06-08');
  let tx: {
    transactionDay: { create: jest.Mock };
    haul: { create: jest.Mock };
    haulAssignment: { create: jest.Mock };
    trip: { create: jest.Mock };
  };
  let prisma: {
    transactionDay: { findUnique: jest.Mock };
    crewSchedule: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: DailyInitService;

  beforeEach(() => {
    tx = {
      transactionDay: { create: jest.fn().mockResolvedValue({ id: 10 }) },
      haul: { create: jest.fn().mockResolvedValue({ id: 100n }) },
      haulAssignment: { create: jest.fn().mockResolvedValue({ id: 1000n }) },
      trip: { create: jest.fn().mockResolvedValue({ id: 10000n }) },
    };
    prisma = {
      transactionDay: { findUnique: jest.fn().mockResolvedValue(null) },
      crewSchedule: { findMany: jest.fn().mockResolvedValue([buildSchedule()]) },
      $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
    };
    service = new DailyInitService(prisma as unknown as PrismaService);
  });

  it('is idempotent — skips when the day already exists', async () => {
    prisma.transactionDay.findUnique.mockResolvedValue({ id: 5 });
    const result = await service.initializeForDate(date);
    expect(result).toEqual({
      created: false,
      date: '2026-06-08',
      transactionDayId: 5,
      hauls: 0,
      assignments: 0,
      trips: 0,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('creates the day, hauls, assignments, and trips with counts', async () => {
    const result = await service.initializeForDate(date);
    expect(result).toEqual({
      created: true,
      date: '2026-06-08',
      transactionDayId: 10,
      hauls: 1,
      assignments: 1,
      trips: 1,
    });
    expect(tx.transactionDay.create).toHaveBeenCalledWith({
      data: { date, status: 'IN_PROGRESS' },
      select: { id: true },
    });
  });

  it('sets operationDate on every partitioned write (partition-aware)', async () => {
    await service.initializeForDate(date);
    expect(tx.haul.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ operationDate: date }) }),
    );
    expect(tx.haulAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ operationDate: date }) }),
    );
    expect(tx.trip.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ operationDate: date }) }),
    );
  });

  it('seeds the target odometer from the vehicle and a composed trip name', async () => {
    await service.initializeForDate(date);
    const assignmentArg = tx.haulAssignment.create.mock.calls[0][0] as {
      data: { departTargetOdometer: number; returnTargetOdometer: number };
    };
    expect(assignmentArg.data.departTargetOdometer).toBe(12000);
    expect(assignmentArg.data.returnTargetOdometer).toBe(12000);
    const tripArg = tx.trip.create.mock.calls[0][0] as {
      data: { name: string; targetOdometer: number };
    };
    expect(tripArg.data.name).toBe('DISPOSAL: TPS A → TPA B');
    expect(tripArg.data.targetOdometer).toBe(12000);
  });

  it('groups schedules sharing a vehicle into one haul with multiple assignments', async () => {
    prisma.crewSchedule.findMany.mockResolvedValue([
      buildSchedule({ id: 1, driverId: 3 }),
      buildSchedule({ id: 2, driverId: 4 }),
    ]);
    const result = await service.initializeForDate(date);
    expect(result.hauls).toBe(1);
    expect(result.assignments).toBe(2);
    expect(tx.haul.create).toHaveBeenCalledTimes(1);
    expect(tx.haulAssignment.create).toHaveBeenCalledTimes(2);
  });

  it('runs for today via the manual trigger and the cron handler', async () => {
    prisma.transactionDay.findUnique.mockResolvedValue({ id: 5 });
    const manual = await service.handleManualToday();
    expect(manual.created).toBe(false);
    await expect(service.handleCron()).resolves.toBeUndefined();
    expect(prisma.transactionDay.findUnique).toHaveBeenCalledTimes(2);
  });

  it('forwards the configured fuel request when present', async () => {
    prisma.crewSchedule.findMany.mockResolvedValue([
      buildSchedule({
        tripTemplates: [
          {
            id: 1,
            routeId: 9,
            targetTime: new Date('1970-01-01T06:00:00Z'),
            fuelRequestedLiters: 40,
            route: {
              id: 9,
              category: 'REFUEL',
              originSite: { name: 'Pool' },
              destinationSite: { name: 'SPBU' },
            },
          },
        ],
      }),
    ]);
    await service.initializeForDate(date);
    const tripArg = tx.trip.create.mock.calls[0][0] as { data: { fuelRequestedLiters?: number } };
    expect(tripArg.data.fuelRequestedLiters).toBe(40);
  });
});
