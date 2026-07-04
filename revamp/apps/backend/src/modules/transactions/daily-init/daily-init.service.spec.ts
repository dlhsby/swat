import { Logger } from '@nestjs/common';

import { parseDateOnly } from '../../../common/dates';
import { type PrismaService } from '../../prisma/prisma.service';

import { DailyInitService } from './daily-init.service';

/** A trip template carrying a corridor (active or soft-deleted) for the day-init copy. */
function templateWithCorridor(corridorDeletedAt: Date | null): Record<string, unknown> {
  return {
    id: 1,
    routeId: 4,
    corridorId: 'c0000000-0000-0000-0000-000000000001',
    corridor: { id: 'c0000000-0000-0000-0000-000000000001', deletedAt: corridorDeletedAt },
    targetTime: new Date('1970-01-01T06:00:00Z'),
    fuelRequestedLiters: null,
    route: {
      id: 4,
      category: 'DISPOSAL',
      originSite: { name: 'TPS A' },
      destinationSite: { name: 'TPA B' },
    },
  };
}

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

type DataArg = { data: Array<Record<string, unknown>>; select?: unknown };

describe('DailyInitService', () => {
  const date = parseDateOnly('2026-06-08');
  let tx: {
    transactionDay: { create: jest.Mock };
    haul: { createManyAndReturn: jest.Mock };
    haulAssignment: { createManyAndReturn: jest.Mock };
    trip: { createMany: jest.Mock };
  };
  let prisma: {
    transactionDay: { findUnique: jest.Mock };
    scheduleTemplate: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: DailyInitService;

  beforeEach(() => {
    tx = {
      transactionDay: { create: jest.fn().mockResolvedValue({ id: 10 }) },
      // Bulk inserts return the generated ids so children can be wired.
      haul: {
        createManyAndReturn: jest.fn(({ data }: DataArg) =>
          Promise.resolve(data.map((d, i) => ({ id: `haul-${i}`, vehicleId: d.vehicleId }))),
        ),
      },
      haulAssignment: {
        createManyAndReturn: jest.fn(({ data }: DataArg) =>
          Promise.resolve(
            data.map((d, i) => ({ id: `asg-${i}`, scheduleTemplateId: d.scheduleTemplateId })),
          ),
        ),
      },
      trip: { createMany: jest.fn(({ data }: DataArg) => Promise.resolve({ count: data.length })) },
    };
    prisma = {
      transactionDay: { findUnique: jest.fn().mockResolvedValue(null) },
      scheduleTemplate: { findMany: jest.fn().mockResolvedValue([buildSchedule()]) },
      $transaction: jest.fn((cb: (t: typeof tx) => unknown) => cb(tx)),
    };
    service = new DailyInitService(prisma as unknown as PrismaService);
  });

  const haulData = (): Array<Record<string, unknown>> =>
    (tx.haul.createManyAndReturn.mock.calls[0][0] as DataArg).data;
  const assignmentData = (): Array<Record<string, unknown>> =>
    (tx.haulAssignment.createManyAndReturn.mock.calls[0][0] as DataArg).data;
  const tripData = (): Array<Record<string, unknown>> =>
    (tx.trip.createMany.mock.calls[0][0] as DataArg).data;

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
    expect(haulData()[0]).toMatchObject({ operationDate: date });
    expect(assignmentData()[0]).toMatchObject({ operationDate: date });
    expect(tripData()[0]).toMatchObject({ operationDate: date });
  });

  it('wires each child to its generated parent id', async () => {
    await service.initializeForDate(date);
    expect(assignmentData()[0]?.haulId).toBe('haul-0'); // haul.vehicleId 7 → haul-0
    expect(tripData()[0]?.haulAssignmentId).toBe('asg-0'); // schedule 1 → asg-0
  });

  it('seeds the target odometer from the vehicle and a composed trip name', async () => {
    await service.initializeForDate(date);
    expect(assignmentData()[0]).toMatchObject({
      departTargetOdometer: 12000,
      returnTargetOdometer: 12000,
    });
    expect(tripData()[0]).toMatchObject({ name: 'DISPOSAL: TPS A → TPA B', targetOdometer: 12000 });
  });

  it('excludes schedules whose vehicle or driver was soft-deleted', async () => {
    await service.initializeForDate(date);
    expect(prisma.scheduleTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { vehicle: { deletedAt: null }, driver: { deletedAt: null } },
      }),
    );
  });

  it('groups schedules sharing a vehicle into one haul with multiple assignments', async () => {
    prisma.scheduleTemplate.findMany.mockResolvedValue([
      buildSchedule({ id: 1, driverId: 3 }),
      buildSchedule({ id: 2, driverId: 4 }),
    ]);
    const result = await service.initializeForDate(date);
    expect(result.hauls).toBe(1);
    expect(result.assignments).toBe(2);
    expect(tx.haul.createManyAndReturn).toHaveBeenCalledTimes(1);
    expect(haulData()).toHaveLength(1);
    expect(assignmentData()).toHaveLength(2);
  });

  it('runs for today via the manual trigger and the cron handler', async () => {
    prisma.transactionDay.findUnique.mockResolvedValue({ id: 5 });
    const manual = await service.handleManualToday();
    expect(manual.created).toBe(false);
    await expect(service.handleCron()).resolves.toBeUndefined();
    expect(prisma.transactionDay.findUnique).toHaveBeenCalledTimes(2);
  });

  it('forwards the configured fuel request when present', async () => {
    prisma.scheduleTemplate.findMany.mockResolvedValue([
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
    expect(tripData()[0]?.fuelRequestedLiters).toBe(40);
  });

  it('carries an active template corridor onto the day trip', async () => {
    prisma.scheduleTemplate.findMany.mockResolvedValue([
      buildSchedule({ tripTemplates: [templateWithCorridor(null)] }),
    ]);
    await service.initializeForDate(date);
    expect(tripData()[0]?.corridorId).toBe('c0000000-0000-0000-0000-000000000001');
  });

  it('skips a soft-deleted template corridor and warns (resolver falls back to route default)', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    prisma.scheduleTemplate.findMany.mockResolvedValue([
      buildSchedule({ tripTemplates: [templateWithCorridor(new Date('2026-06-01T00:00:00Z'))] }),
    ]);
    await service.initializeForDate(date);
    expect(tripData()[0]?.corridorId).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('soft-deleted corridor'));
    warn.mockRestore();
  });
});
