import { BadRequestException, NotFoundException } from '@nestjs/common';

import { type DailyInitService } from '../daily-init/daily-init.service';

import { type TransactionDaysRepository } from './transaction-days.repository';
import { TransactionDaysService } from './transaction-days.service';

function buildDay(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'day-1',
    date: new Date('2026-06-08T00:00:00Z'),
    status: 'IN_PROGRESS',
    createdAt: new Date('2026-06-08T03:00:00Z'),
    updatedAt: new Date('2026-06-08T03:00:00Z'),
    hauls: [
      {
        id: 'haul-100',
        vehicleId: 'vehicle-7',
        vehicle: { id: 'vehicle-7', plateNumber: 'L 1 AB' },
        status: 'IN_PROGRESS',
        operationDate: new Date('2026-06-08T00:00:00Z'),
        assignments: [],
      },
    ],
    ...overrides,
  };
}

describe('TransactionDaysService', () => {
  let repo: {
    findById: jest.Mock;
    findByDate: jest.Mock;
    updateStatus: jest.Mock;
    countOpenHauls: jest.Mock;
    listSummaries: jest.Mock;
    cctvByTripIds: jest.Mock;
  };
  let dailyInit: { handleManualToday: jest.Mock };
  let service: TransactionDaysService;

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      findByDate: jest.fn(),
      updateStatus: jest.fn(),
      countOpenHauls: jest.fn().mockResolvedValue(0),
      listSummaries: jest.fn(),
      cctvByTripIds: jest.fn().mockResolvedValue([]),
    };
    dailyInit = { handleManualToday: jest.fn() };
    service = new TransactionDaysService(
      repo as unknown as TransactionDaysRepository,
      dailyInit as unknown as DailyInitService,
    );
  });

  it('returns the full tree by id with ids as strings', async () => {
    repo.findById.mockResolvedValue(buildDay());
    const result = await service.getById('day-1');
    expect(result.date).toBe('2026-06-08');
    expect(result.hauls[0]).toMatchObject({ id: 'haul-100', vehiclePlate: 'L 1 AB' });
  });

  it('404s an unknown id', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getById('day-9')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('looks a day up by date', async () => {
    repo.findByDate.mockResolvedValue(buildDay());
    await expect(service.getByDate('2026-06-08')).resolves.toMatchObject({ id: 'day-1' });
    expect(repo.findByDate).toHaveBeenCalledWith(new Date('2026-06-08T00:00:00.000Z'));
  });

  it('404s an unknown date', async () => {
    repo.findByDate.mockResolvedValue(null);
    await expect(service.getByDate('2026-01-01')).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('updateStatus', () => {
    it('blocks marking DONE while hauls are still open', async () => {
      repo.findById.mockResolvedValue(buildDay());
      repo.countOpenHauls.mockResolvedValue(2);
      await expect(service.updateStatus('day-1', 'DONE')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repo.updateStatus).not.toHaveBeenCalled();
    });

    it('marks DONE when all hauls are complete', async () => {
      repo.findById.mockResolvedValue(buildDay());
      repo.countOpenHauls.mockResolvedValue(0);
      repo.updateStatus.mockResolvedValue(buildDay({ status: 'DONE' }));
      const result = await service.updateStatus('day-1', 'DONE');
      expect(result.status).toBe('DONE');
      expect(repo.updateStatus).toHaveBeenCalledWith('day-1', 'DONE');
    });

    it('reopens (IN_PROGRESS) without the open-haul guard', async () => {
      repo.findById.mockResolvedValue(buildDay({ status: 'DONE' }));
      repo.updateStatus.mockResolvedValue(buildDay({ status: 'IN_PROGRESS' }));
      await service.updateStatus('day-1', 'IN_PROGRESS');
      expect(repo.countOpenHauls).not.toHaveBeenCalled();
      expect(repo.updateStatus).toHaveBeenCalledWith('day-1', 'IN_PROGRESS');
    });
  });

  describe('list', () => {
    it('maps summary rows and wraps them with pagination meta (date → YYYY-MM-DD)', async () => {
      repo.listSummaries.mockResolvedValue({
        rows: [
          {
            id: 'day-1',
            date: new Date('2026-06-08T00:00:00Z'),
            status: 'DONE',
            vehicleCount: 12,
            tonnageKg: 34_500,
          },
        ],
        total: 1,
      });
      const result = await service.list({ page: 1, limit: 20 });
      expect(repo.listSummaries).toHaveBeenCalledWith({ page: 1, limit: 20, status: undefined });
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 20 });
      expect(result.data[0]).toEqual({
        id: 'day-1',
        date: '2026-06-08',
        status: 'DONE',
        vehicleCount: 12,
        tonnageKg: 34_500,
      });
    });

    it('forwards the status filter', async () => {
      repo.listSummaries.mockResolvedValue({ rows: [], total: 0 });
      await service.list({ page: 2, limit: 50, status: 'IN_PROGRESS' });
      expect(repo.listSummaries).toHaveBeenCalledWith({
        page: 2,
        limit: 50,
        status: 'IN_PROGRESS',
      });
    });
  });

  it('delegates the manual trigger to the daily-init service', async () => {
    const initResult = {
      created: true,
      date: '2026-06-08',
      transactionDayId: 1,
      hauls: 1,
      assignments: 1,
      trips: 2,
    };
    dailyInit.handleManualToday.mockResolvedValue(initResult);
    await expect(service.initializeToday()).resolves.toEqual(initResult);
  });
});
