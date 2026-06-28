import { BadRequestException, NotFoundException } from '@nestjs/common';

import { type PrismaService } from '../prisma/prisma.service';

import { TripFinderService } from './trip-finder.service';

const PARAMS = {
  vehicleId: '00000000-0000-0000-0000-0000000000e1',
  transactionDayId: '00000000-0000-0000-0000-000000000a01',
  operationDate: new Date('2026-06-05T00:00:00Z'),
  tpaSiteId: '00000000-0000-0000-0000-0000000000f1',
  tpaSiteName: 'TPA Benowo',
};

describe('TripFinderService', () => {
  let prisma: {
    haul: { findFirst: jest.Mock };
    haulAssignment: { findUnique: jest.Mock };
    route: { findFirst: jest.Mock };
    trip: { create: jest.Mock };
  };
  let service: TripFinderService;

  beforeEach(() => {
    prisma = {
      haul: { findFirst: jest.fn() },
      haulAssignment: {
        findUnique: jest.fn().mockResolvedValue({ id: 'a1', operationDate: PARAMS.operationDate }),
      },
      route: { findFirst: jest.fn() },
      trip: { create: jest.fn() },
    };
    service = new TripFinderService(prisma as unknown as PrismaService);
  });

  it('404s when no Haul exists for the vehicle+day', async () => {
    prisma.haul.findFirst.mockResolvedValue(null);
    await expect(service.findOrCreateDisposalTrip(PARAMS)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns an existing non-verified DISPOSAL trip', async () => {
    const existing = { id: 'trip-1', status: 'IN_PROGRESS', route: { category: 'DISPOSAL' } };
    prisma.haul.findFirst.mockResolvedValue({
      assignments: [{ id: 'a1', trips: [existing] }],
    });
    const result = await service.findOrCreateDisposalTrip(PARAMS);
    expect(result.created).toBe(false);
    expect(result.trip).toBe(existing);
    expect(prisma.trip.create).not.toHaveBeenCalled();
  });

  it('skips a VERIFIED disposal trip and creates an ad-hoc one', async () => {
    prisma.haul.findFirst.mockResolvedValue({
      assignments: [
        { id: 'a1', trips: [{ id: 'old', status: 'VERIFIED', route: { category: 'DISPOSAL' } }] },
      ],
    });
    prisma.route.findFirst.mockResolvedValue({ id: 'route-1' });
    prisma.trip.create.mockResolvedValue({ id: 'new-trip' });
    const result = await service.findOrCreateDisposalTrip(PARAMS);
    expect(result.created).toBe(true);
    expect(result.trip).toEqual({ id: 'new-trip' });
    expect(prisma.trip.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ routeId: 'route-1', haulAssignmentId: 'a1' }),
      }),
    );
  });

  it('404s when no DISPOSAL route to the TPA exists', async () => {
    prisma.haul.findFirst.mockResolvedValue({ assignments: [{ id: 'a1', trips: [] }] });
    prisma.route.findFirst.mockResolvedValue(null);
    await expect(service.findOrCreateDisposalTrip(PARAMS)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  describe('createAdHocTrip', () => {
    it('creates a trip from an explicit routeId, inheriting the assignment operationDate', async () => {
      prisma.route.findFirst.mockResolvedValue({
        id: 'route-1',
        originSite: { name: 'Pool' },
        destinationSite: { name: 'TPS A' },
      });
      prisma.trip.create.mockResolvedValue({ id: 'new-trip' });
      const trip = await service.createAdHocTrip({
        haulAssignmentId: 'a1',
        routeId: 'route-1',
        createdById: 'user-1',
      });
      expect(trip).toEqual({ id: 'new-trip' });
      expect(prisma.trip.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          haulAssignmentId: 'a1',
          routeId: 'route-1',
          operationDate: PARAMS.operationDate,
          status: 'IN_PROGRESS',
          name: 'Pool → TPS A',
          createdById: 'user-1',
        }),
      });
    });

    it('infers the route from category + destinationSiteId', async () => {
      prisma.route.findFirst.mockResolvedValue({
        id: 'route-2',
        originSite: { name: 'TPS B' },
        destinationSite: { name: 'TPA Benowo' },
      });
      prisma.trip.create.mockResolvedValue({ id: 'trip-2' });
      await service.createAdHocTrip({
        haulAssignmentId: 'a1',
        category: 'DISPOSAL',
        destinationSiteId: 'site-1',
      });
      expect(prisma.route.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'DISPOSAL', destinationSiteId: 'site-1' }),
        }),
      );
    });

    it('400s when neither routeId nor category+destination is given', async () => {
      await expect(service.createAdHocTrip({ haulAssignmentId: 'a1' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('404s when the assignment does not exist', async () => {
      prisma.haulAssignment.findUnique.mockResolvedValue(null);
      await expect(
        service.createAdHocTrip({ haulAssignmentId: 'missing', routeId: 'route-1' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
