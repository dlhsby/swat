import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { type PrismaService } from '../../../prisma/prisma.service';

import { DriverLicensesService } from './driver-licenses.service';

function buildRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: '550e8400-e29b-41d4-a716-446655440001',
    driverId: '550e8400-e29b-41d4-a716-446655440002',
    licenseClassId: '550e8400-e29b-41d4-a716-446655440003',
    licenseNumber: 'SIM-1',
    expiry: new Date('2030-01-01T00:00:00Z'),
    licenseClass: { name: 'BII Umum' },
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('DriverLicensesService', () => {
  let prisma: {
    driver: { findFirst: jest.Mock };
    licenseClass: { findUnique: jest.Mock };
    driverLicense: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let service: DriverLicensesService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      driver: {
        findFirst: jest.fn().mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440002' }),
      },
      licenseClass: {
        findUnique: jest.fn().mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440003' }),
      },
      driverLicense: {
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new DriverLicensesService(prisma as unknown as PrismaService);
  });

  const dto = {
    licenseClassId: '550e8400-e29b-41d4-a716-446655440003',
    licenseNumber: 'SIM-1',
    expiry: '2030-01-01',
  };

  it('404s listing for an unknown driver', async () => {
    prisma.driver.findFirst.mockResolvedValue(null);
    await expect(service.list('550e8400-e29b-41d4-a716-446655440002')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lists licenses with a derived expired flag', async () => {
    prisma.driverLicense.findMany.mockResolvedValue([
      buildRow({ expiry: new Date('2020-01-01T00:00:00Z') }),
    ]);
    const result = await service.list('550e8400-e29b-41d4-a716-446655440002');
    expect(result[0]).toMatchObject({ licenseClassName: 'BII Umum', expired: true });
  });

  it('rejects a missing license class on create', async () => {
    prisma.licenseClass.findUnique.mockResolvedValue(null);
    await expect(
      service.create('550e8400-e29b-41d4-a716-446655440002', dto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a duplicate license number for the driver', async () => {
    prisma.driverLicense.findFirst.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440099',
    });
    await expect(
      service.create('550e8400-e29b-41d4-a716-446655440002', dto),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates a license', async () => {
    prisma.driverLicense.create.mockResolvedValue(buildRow());
    await expect(
      service.create('550e8400-e29b-41d4-a716-446655440002', dto),
    ).resolves.toMatchObject({
      licenseNumber: 'SIM-1',
      expired: false,
    });
  });

  it('404s updating a license not owned by the driver', async () => {
    prisma.driverLicense.findFirst.mockResolvedValue(null);
    await expect(
      service.update(
        '550e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440099',
        { expiry: '2031-01-01' },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates and deletes an owned license', async () => {
    prisma.driverLicense.findFirst.mockResolvedValue({ licenseNumber: 'SIM-1' });
    prisma.driverLicense.update.mockResolvedValue(buildRow({ expiry: new Date('2031-01-01') }));
    await expect(
      service.update(
        '550e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440001',
        { expiry: '2031-01-01' },
      ),
    ).resolves.toMatchObject({
      driverId: '550e8400-e29b-41d4-a716-446655440002',
    });

    prisma.driverLicense.findFirst.mockResolvedValue({ licenseNumber: 'SIM-1' });
    await expect(
      service.remove(
        '550e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440001',
      ),
    ).resolves.toEqual({ message: 'SIM telah dihapus.' });
  });
});
