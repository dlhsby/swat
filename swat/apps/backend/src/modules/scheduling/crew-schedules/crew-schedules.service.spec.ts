import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { type CrewSchedulesRepository } from './crew-schedules.repository';
import { CrewSchedulesService } from './crew-schedules.service';

function buildSchedule(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    vehicleId: 1,
    driverId: 2,
    departTime: new Date('1970-01-01T05:00:00Z'),
    returnTime: new Date('1970-01-01T14:00:00Z'),
    vehicle: { id: 1, plateNumber: 'L 1 AB' },
    driver: { id: 2, name: 'Budi' },
    _count: { tripTemplates: 3 },
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('CrewSchedulesService', () => {
  let repo: {
    list: jest.Mock;
    findById: jest.Mock;
    findByVehicleAndDriver: jest.Mock;
    vehicleExists: jest.Mock;
    driverExists: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let service: CrewSchedulesService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = {
      list: jest.fn(),
      findById: jest.fn(),
      findByVehicleAndDriver: jest.fn().mockResolvedValue(null),
      vehicleExists: jest.fn().mockResolvedValue({ id: 1 }),
      driverExists: jest.fn().mockResolvedValue({ id: 2 }),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new CrewSchedulesService(repo as unknown as CrewSchedulesRepository);
  });

  const dto = { vehicleId: 1, driverId: 2, departTime: '05:00', returnTime: '14:00' };

  it('rejects depart >= return', async () => {
    await expect(
      service.create({ ...dto, departTime: '14:00', returnTime: '05:00' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a duplicate vehicle+driver pairing', async () => {
    repo.findByVehicleAndDriver.mockResolvedValue({ id: 9 });
    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a missing vehicle', async () => {
    repo.vehicleExists.mockResolvedValue(null);
    await expect(service.create(dto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a schedule and maps time columns to HH:mm', async () => {
    repo.create.mockResolvedValue(buildSchedule());
    const result = await service.create(dto);
    expect(result).toMatchObject({
      departTime: '05:00',
      returnTime: '14:00',
      tripTemplateCount: 3,
    });
  });

  it('404s an unknown schedule', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getById(9)).rejects.toBeInstanceOf(NotFoundException);
  });
});
