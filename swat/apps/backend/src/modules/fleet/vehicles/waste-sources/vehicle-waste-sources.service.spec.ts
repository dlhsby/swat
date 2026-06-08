import { ConflictException, NotFoundException } from '@nestjs/common';

import { type PrismaService } from '../../../prisma/prisma.service';

import { VehicleWasteSourcesService } from './vehicle-waste-sources.service';

describe('VehicleWasteSourcesService', () => {
  let prisma: {
    vehicle: { findFirst: jest.Mock };
    wasteSource: { findUnique: jest.Mock };
    vehicleWasteSource: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
  };
  let service: VehicleWasteSourcesService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      vehicle: { findFirst: jest.fn().mockResolvedValue({ id: 1 }) },
      wasteSource: {
        findUnique: jest.fn().mockResolvedValue({ id: 2, code: 'PS', name: 'Pasar' }),
      },
      vehicleWasteSource: {
        findMany: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new VehicleWasteSourcesService(prisma as unknown as PrismaService);
  });

  it('404s when the vehicle is missing', async () => {
    prisma.vehicle.findFirst.mockResolvedValue(null);
    await expect(service.list(9)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists linked waste sources', async () => {
    prisma.vehicleWasteSource.findMany.mockResolvedValue([
      { id: 10, wasteSourceId: 2, wasteSource: { id: 2, code: 'PS', name: 'Pasar' } },
    ]);
    const result = await service.list(1);
    expect(result[0]).toMatchObject({ wasteSourceId: 2, code: 'PS', name: 'Pasar' });
  });

  it('404s adding a missing waste source', async () => {
    prisma.wasteSource.findUnique.mockResolvedValue(null);
    await expect(service.add(1, 99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('409s a duplicate link', async () => {
    prisma.vehicleWasteSource.findUnique.mockResolvedValue({ id: 10 });
    await expect(service.add(1, 2)).rejects.toBeInstanceOf(ConflictException);
  });

  it('adds a link', async () => {
    prisma.vehicleWasteSource.create.mockResolvedValue({ id: 10, wasteSourceId: 2 });
    await expect(service.add(1, 2)).resolves.toMatchObject({ code: 'PS', name: 'Pasar' });
  });

  it('404s removing a non-existent link, else removes', async () => {
    prisma.vehicleWasteSource.findUnique.mockResolvedValueOnce(null);
    await expect(service.remove(1, 2)).rejects.toBeInstanceOf(NotFoundException);
    prisma.vehicleWasteSource.findUnique.mockResolvedValueOnce({ id: 10 });
    await expect(service.remove(1, 2)).resolves.toEqual({
      message: 'Tautan sumber sampah telah dihapus.',
    });
  });
});
