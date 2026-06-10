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

  const ID = '00000000-0000-0000-0000-000000000001';
  const ID9 = '00000000-0000-0000-0000-000000000009';
  const VID = '00000000-0000-0000-0000-0000000000a1';
  const DID = '00000000-0000-0000-0000-0000000000a2';
  const dto = { vehicleId: VID, driverId: DID, departTime: '05:00', returnTime: '14:00' };

  it('lists schedules with time columns mapped to HH:mm and template count', async () => {
    repo.list.mockResolvedValue({ rows: [buildSchedule()], total: 1 });
    const result = await service.list({ page: 1, limit: 20 });
    expect(result.meta).toEqual({ total: 1, page: 1, limit: 20 });
    expect(result.data[0]).toMatchObject({
      departTime: '05:00',
      returnTime: '14:00',
      tripTemplateCount: 3,
    });
  });

  it('returns a single schedule', async () => {
    repo.findById.mockResolvedValue(buildSchedule());
    await expect(service.getById(ID)).resolves.toMatchObject({ id: 1 });
  });

  describe('create', () => {
    it('rejects depart >= return', async () => {
      await expect(
        service.create({ ...dto, departTime: '14:00', returnTime: '05:00' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a duplicate vehicle+driver pairing', async () => {
      repo.findByVehicleAndDriver.mockResolvedValue({ id: 9 });
      await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects a missing vehicle or driver', async () => {
      repo.vehicleExists.mockResolvedValueOnce(null);
      await expect(service.create(dto)).rejects.toBeInstanceOf(BadRequestException);
      repo.vehicleExists.mockResolvedValue({ id: 1 });
      repo.driverExists.mockResolvedValueOnce(null);
      await expect(service.create(dto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates a schedule', async () => {
      repo.create.mockResolvedValue(buildSchedule());
      await expect(service.create(dto)).resolves.toMatchObject({ departTime: '05:00' });
    });
  });

  describe('update', () => {
    it('404s an unknown schedule', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.update(ID9, { returnTime: '15:00' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects an update that inverts the time order', async () => {
      repo.findById.mockResolvedValue(buildSchedule());
      await expect(service.update(ID, { departTime: '20:00' })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects an update that collides with another pairing', async () => {
      repo.findById.mockResolvedValue(buildSchedule());
      repo.findByVehicleAndDriver.mockResolvedValue({ id: 2 });
      await expect(
        service.update(ID, { vehicleId: '00000000-0000-0000-0000-000000000005' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('updates the return time', async () => {
      repo.findById.mockResolvedValue(buildSchedule());
      repo.update.mockResolvedValue(
        buildSchedule({ returnTime: new Date('1970-01-01T15:00:00Z') }),
      );
      await expect(service.update(ID, { returnTime: '15:00' })).resolves.toMatchObject({
        returnTime: '15:00',
      });
    });
  });

  describe('remove', () => {
    it('404s an unknown schedule', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.remove(ID9)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('deletes a schedule', async () => {
      repo.findById.mockResolvedValue(buildSchedule());
      repo.delete.mockResolvedValue({ id: 1 });
      await expect(service.remove(ID)).resolves.toEqual({ message: 'Jadwal kru telah dihapus.' });
    });
  });
});
