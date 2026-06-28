import { NotFoundException } from '@nestjs/common';

import { type DeviationAlertRepository } from './deviation-alert.repository';
import { DeviationAlertService, type RaiseDeviationInput } from './deviation-alert.service';
import { type GpsAlertPublisher } from './gps-alert.publisher';

const VEHICLE = '00000000-0000-0000-0000-0000000000a1';

function alertRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'al1',
    vehicleId: VEHICLE,
    tripId: 't1',
    alertType: 'off_corridor',
    severity: 'WARNING',
    latitude: { toNumber: () => -7.25 },
    longitude: { toNumber: () => 112.75 },
    distanceM: 240,
    pingCount: 1,
    isAcknowledged: false,
    acknowledgedAt: null,
    resolvedAt: null,
    notes: null,
    createdAt: new Date('2026-06-25T10:00:00Z'),
    vehicle: { id: VEHICLE, plateNumber: 'L 1234 AB' },
    ...overrides,
  };
}

const RAISE: RaiseDeviationInput = {
  vehicleId: VEHICLE,
  tripId: 't1',
  alertType: 'off_corridor',
  severity: 'WARNING',
  latitude: -7.25,
  longitude: 112.75,
  distanceM: 240,
};

describe('DeviationAlertService', () => {
  let repo: {
    findOpen: jest.Mock;
    create: jest.Mock;
    incrementPingCount: jest.Mock;
    resolveOpen: jest.Mock;
    findById: jest.Mock;
    acknowledge: jest.Mock;
    list: jest.Mock;
  };
  let publisher: { publish: jest.Mock };
  let service: DeviationAlertService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = {
      findOpen: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(alertRow()),
      incrementPingCount: jest.fn().mockResolvedValue(undefined),
      resolveOpen: jest.fn().mockResolvedValue(1),
      findById: jest.fn(),
      acknowledge: jest.fn().mockResolvedValue(alertRow({ isAcknowledged: true })),
      list: jest.fn(),
    };
    publisher = { publish: jest.fn().mockResolvedValue(undefined) };
    service = new DeviationAlertService(
      repo as unknown as DeviationAlertRepository,
      publisher as unknown as GpsAlertPublisher,
    );
  });

  it('raises a new alert and publishes it', async () => {
    await service.raiseOrCoalesce(RAISE);
    expect(repo.create).toHaveBeenCalled();
    expect(publisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'al1', alertType: 'off_corridor', distanceM: 240 }),
    );
    expect(repo.incrementPingCount).not.toHaveBeenCalled();
  });

  it('coalesces into an open alert (increment, no new publish)', async () => {
    repo.findOpen.mockResolvedValue({ id: 'al1' });
    await service.raiseOrCoalesce(RAISE);
    expect(repo.incrementPingCount).toHaveBeenCalledWith('al1');
    expect(repo.create).not.toHaveBeenCalled();
    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it('auto-resolves open alerts of a type', async () => {
    await expect(service.autoResolve(VEHICLE, 'off_corridor')).resolves.toBe(1);
    expect(repo.resolveOpen).toHaveBeenCalledWith(VEHICLE, 'off_corridor');
  });

  it('lists alerts as DTOs', async () => {
    repo.list.mockResolvedValue({ rows: [alertRow()], total: 1 });
    const result = await service.list({ page: 1, limit: 20 } as never);
    expect(result.meta).toEqual({ total: 1, page: 1, limit: 20 });
    expect(result.data[0]).toMatchObject({
      vehiclePlate: 'L 1234 AB',
      latitude: -7.25,
      distanceM: 240,
    });
  });

  it('acknowledges an existing alert', async () => {
    repo.findById.mockResolvedValue(alertRow());
    const result = await service.acknowledge('al1', 'user-1', 'checked');
    expect(repo.acknowledge).toHaveBeenCalledWith('al1', 'user-1', 'checked');
    expect(result.isAcknowledged).toBe(true);
  });

  it('throws NotFound acknowledging a missing alert', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.acknowledge('nope', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
