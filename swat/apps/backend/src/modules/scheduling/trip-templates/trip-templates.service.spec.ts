import { BadRequestException, NotFoundException } from '@nestjs/common';

import { type RoutesService } from '../../geography/routes/routes.service';
import { type PrismaService } from '../../prisma/prisma.service';

import { TripTemplatesService } from './trip-templates.service';

function buildRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    scheduleTemplateId: 1,
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
    scheduleTemplate: { findFirst: jest.Mock };
    tripTemplate: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let routes: { resolveOrCreate: jest.Mock };
  let service: TripTemplatesService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      scheduleTemplate: { findFirst: jest.fn().mockResolvedValue({ id: 1 }) },
      tripTemplate: {
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue({ id: 1 }),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    routes = { resolveOrCreate: jest.fn().mockResolvedValue({ id: 2 }) };
    service = new TripTemplatesService(
      prisma as unknown as PrismaService,
      routes as unknown as RoutesService,
    );
  });

  const SID = '00000000-0000-0000-0000-000000000001';
  const SID9 = '00000000-0000-0000-0000-000000000009';
  const TID = '00000000-0000-0000-0000-0000000000a1';
  const TID5 = '00000000-0000-0000-0000-0000000000a5';
  const ORIGIN = '00000000-0000-0000-0000-0000000000d1';
  const DEST = '00000000-0000-0000-0000-0000000000d2';
  const RID3 = '00000000-0000-0000-0000-0000000000b3';
  const dto = {
    category: 'DISPOSAL' as const,
    originSiteId: ORIGIN,
    destinationSiteId: DEST,
    targetTime: '06:30',
    fuelRequestedLiters: 20,
  };

  it('404s for an unknown schedule template', async () => {
    prisma.scheduleTemplate.findFirst.mockResolvedValue(null);
    await expect(service.list(SID9)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists templates with a route label and HH:mm time + numeric liters', async () => {
    prisma.tripTemplate.findMany.mockResolvedValue([buildRow()]);
    const result = await service.list(SID);
    expect(result[0]).toMatchObject({
      routeLabel: 'TPS → TPA',
      targetTime: '06:30',
      fuelRequestedLiters: 20,
    });
  });

  it('propagates a route-resolution error on create (e.g. invalid self-loop)', async () => {
    routes.resolveOrCreate.mockRejectedValue(new BadRequestException('bad'));
    await expect(service.create(SID, dto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a template, resolving the route from category + start/end', async () => {
    prisma.tripTemplate.create.mockResolvedValue(buildRow());
    await expect(service.create(SID, dto)).resolves.toMatchObject({ routeId: 2 });
    expect(routes.resolveOrCreate).toHaveBeenCalledWith('DISPOSAL', ORIGIN, DEST);
    expect(prisma.tripTemplate.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ routeId: 2 }) }),
    );
  });

  it('404s updating/removing a template not under the schedule', async () => {
    prisma.tripTemplate.findFirst.mockResolvedValue(null);
    await expect(service.update(SID, TID5, { targetTime: '07:00' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.remove(SID, TID5)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('leaves the route untouched on a time/fuel-only update', async () => {
    prisma.tripTemplate.findFirst.mockResolvedValue({ id: 1 });
    prisma.tripTemplate.update.mockResolvedValue(buildRow());
    await service.update(SID, TID, { targetTime: '07:00' });
    expect(routes.resolveOrCreate).not.toHaveBeenCalled();
    expect(prisma.tripTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ routeId: expect.anything() }),
      }),
    );
  });

  it('re-resolves the route when the full triple is supplied on update', async () => {
    prisma.tripTemplate.findFirst.mockResolvedValue({ id: 1 });
    routes.resolveOrCreate.mockResolvedValue({ id: RID3 });
    prisma.tripTemplate.update.mockResolvedValue(buildRow());
    await service.update(SID, TID, {
      category: 'DISPOSAL',
      originSiteId: ORIGIN,
      destinationSiteId: DEST,
      targetTime: '07:00',
      fuelRequestedLiters: 25,
    });
    expect(prisma.tripTemplate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: TID },
        data: expect.objectContaining({ routeId: RID3, fuelRequestedLiters: 25 }),
      }),
    );
  });

  it('removes an owned template', async () => {
    await expect(service.remove(SID, TID)).resolves.toEqual({
      message: 'Template trayek telah dihapus.',
    });
  });
});
