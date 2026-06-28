import { ConflictException, NotFoundException } from '@nestjs/common';

import { type PrismaService } from '../../../prisma/prisma.service';

import { VehicleWasteSourcesService } from './vehicle-waste-sources.service';

describe('VehicleWasteSourcesService', () => {
  let prisma: {
    vehicle: { findFirst: jest.Mock };
    wasteSource: { findUnique: jest.Mock };
    vehicleWasteSource: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
  };
  let service: VehicleWasteSourcesService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      vehicle: {
        findFirst: jest.fn().mockResolvedValue({ id: '00000000-0000-0000-0000-000000000001' }),
      },
      wasteSource: {
        findUnique: jest.fn().mockResolvedValue({
          id: '00000000-0000-0000-0000-000000000002',
          code: 'PS',
          name: 'Pasar',
        }),
      },
      vehicleWasteSource: {
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new VehicleWasteSourcesService(prisma as unknown as PrismaService);
  });

  it('404s when the vehicle is missing', async () => {
    prisma.vehicle.findFirst.mockResolvedValue(null);
    await expect(service.list('00000000-0000-0000-0000-000000000009')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lists linked waste sources', async () => {
    prisma.vehicleWasteSource.findMany.mockResolvedValue([
      {
        id: '00000000-0000-0000-0000-000000000010',
        wasteSourceId: '00000000-0000-0000-0000-000000000002',
        wasteSource: { id: '00000000-0000-0000-0000-000000000002', code: 'PS', name: 'Pasar' },
      },
    ]);
    const result = await service.list('00000000-0000-0000-0000-000000000001');
    expect(result[0]).toMatchObject({
      wasteSourceId: '00000000-0000-0000-0000-000000000002',
      code: 'PS',
      name: 'Pasar',
    });
  });

  it('404s adding a missing waste source', async () => {
    prisma.wasteSource.findUnique.mockResolvedValue(null);
    await expect(
      service.add('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000099'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('409s a duplicate link', async () => {
    prisma.vehicleWasteSource.findFirst.mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000010',
    });
    await expect(
      service.add('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('adds a link', async () => {
    prisma.vehicleWasteSource.create.mockResolvedValue({
      id: '00000000-0000-0000-0000-000000000010',
      wasteSourceId: '00000000-0000-0000-0000-000000000002',
    });
    await expect(
      service.add('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'),
    ).resolves.toMatchObject({ code: 'PS', name: 'Pasar' });
  });

  it('404s removing a non-existent link, else removes', async () => {
    prisma.vehicleWasteSource.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.remove(
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    prisma.vehicleWasteSource.findFirst.mockResolvedValueOnce({
      id: '00000000-0000-0000-0000-000000000010',
    });
    await expect(
      service.remove(
        '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
      ),
    ).resolves.toEqual({
      message: 'Tautan sumber sampah telah dihapus.',
    });
  });
});
