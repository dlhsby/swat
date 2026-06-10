import { TripStatus } from '@prisma/client';

import { type RefuelsRepository } from './refuels.repository';
import { RefuelsService } from './refuels.service';

function buildRefuel(overrides: {
  requested?: number | null;
  approved?: number | null;
  price?: number | null;
}): Record<string, unknown> {
  const { requested = 30, approved = 30, price = 6800 } = overrides;
  return {
    id: 'trip-100',
    operationDate: new Date('2026-06-08T00:00:00Z'),
    status: TripStatus.VERIFIED,
    fuelRequestedLiters: requested === null ? null : { toString: () => String(requested) },
    fuelApprovedLiters: approved === null ? null : { toString: () => String(approved) },
    recordedBy: { id: 'user-2', name: 'Sari' },
    haulAssignment: {
      haul: {
        vehicleId: 'vehicle-1',
        vehicle: {
          id: 'vehicle-1',
          plateNumber: 'L 1 AB',
          model: {
            fuel: price === null ? null : { id: 'fuel-9', name: 'Solar', pricePerLiter: price },
          },
        },
      },
    },
  };
}

describe('RefuelsService', () => {
  let repo: { list: jest.Mock };
  let service: RefuelsService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = { list: jest.fn() };
    service = new RefuelsService(repo as unknown as RefuelsRepository);
  });

  it('derives estimated cost = approved × pricePerLiter', async () => {
    repo.list.mockResolvedValue({ rows: [buildRefuel({ approved: 30, price: 6800 })], total: 1 });
    const result = await service.list({ page: 1, limit: 20 });
    expect(result.data[0]).toMatchObject({
      vehiclePlate: 'L 1 AB',
      fuelName: 'Solar',
      estimatedCost: 204000,
      anomaly: false,
    });
  });

  it('flags an anomaly when approved < requested', async () => {
    repo.list.mockResolvedValue({ rows: [buildRefuel({ requested: 40, approved: 30 })], total: 1 });
    const result = await service.list({ page: 1, limit: 20 });
    expect(result.data[0]?.anomaly).toBe(true);
  });

  it('handles missing fuel/amounts without cost', async () => {
    repo.list.mockResolvedValue({
      rows: [buildRefuel({ approved: null, price: null })],
      total: 1,
    });
    const result = await service.list({ page: 1, limit: 20 });
    expect(result.data[0]).toMatchObject({ estimatedCost: null, anomaly: false, fuelName: null });
  });

  it('passes filters through to the repository', async () => {
    repo.list.mockResolvedValue({ rows: [], total: 0 });
    await service.list({
      page: 1,
      limit: 20,
      vehicleId: 'vehicle-1',
      fuelId: 'fuel-9',
      date: '2026-06-08',
    });
    expect(repo.list).toHaveBeenCalledWith(
      expect.objectContaining({ vehicleId: 'vehicle-1', fuelId: 'fuel-9', date: expect.any(Date) }),
    );
  });
});
