import { BadRequestException, NotFoundException } from '@nestjs/common';

import { type PrismaService } from '../../prisma/prisma.service';

import { TripTemplatesService } from './trip-templates.service';

function buildRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    crewScheduleId: 1,
    routeId: 2,
    targetTime: new Date('1970-01-01T06:30:00Z'),
    fuelRequestedLiters: '20.00',
    route: {
      id: 2,
      category: 'DISPOSAL',
      originSite: { name: 'TPS' },
      destinationSite: { name: 'TPA' },
    },
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('TripTemplatesService', () => {
  let prisma: {
    crewSchedule: { findUnique: jest.Mock };
    route: { findFirst: jest.Mock };
    tripTemplate: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let service: TripTemplatesService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      crewSchedule: { findUnique: jest.fn().mockResolvedValue({ id: 1 }) },
      route: { findFirst: jest.fn().mockResolvedValue({ id: 2 }) },
      tripTemplate: {
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue({ id: 1 }),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new TripTemplatesService(prisma as unknown as PrismaService);
  });

  const dto = { routeId: 2, targetTime: '06:30', fuelRequestedLiters: 20 };

  it('404s for an unknown crew schedule', async () => {
    prisma.crewSchedule.findUnique.mockResolvedValue(null);
    await expect(service.list(9)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists templates with a route label and HH:mm time + numeric liters', async () => {
    prisma.tripTemplate.findMany.mockResolvedValue([buildRow()]);
    const result = await service.list(1);
    expect(result[0]).toMatchObject({
      routeLabel: 'TPS → TPA',
      targetTime: '06:30',
      fuelRequestedLiters: 20,
    });
  });

  it('rejects a missing route on create', async () => {
    prisma.route.findFirst.mockResolvedValue(null);
    await expect(service.create(1, dto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a template', async () => {
    prisma.tripTemplate.create.mockResolvedValue(buildRow());
    await expect(service.create(1, dto)).resolves.toMatchObject({ routeId: 2 });
  });

  it('404s updating/removing a template not under the schedule', async () => {
    prisma.tripTemplate.findFirst.mockResolvedValue(null);
    await expect(service.update(1, 5, { targetTime: '07:00' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.remove(1, 5)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an update whose new route is missing', async () => {
    prisma.tripTemplate.findFirst.mockResolvedValue({ id: 1 });
    prisma.route.findFirst.mockResolvedValue(null);
    await expect(service.update(1, 1, { routeId: 99 })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates route, time, and fuel together', async () => {
    prisma.tripTemplate.findFirst.mockResolvedValue({ id: 1 });
    prisma.tripTemplate.update.mockResolvedValue(buildRow());
    await service.update(1, 1, { routeId: 3, targetTime: '07:00', fuelRequestedLiters: 25 });
    expect(prisma.tripTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ routeId: 3, fuelRequestedLiters: 25 }),
      }),
    );
  });

  it('removes an owned template', async () => {
    await expect(service.remove(1, 1)).resolves.toEqual({
      message: 'Template trayek telah dihapus.',
    });
  });
});
