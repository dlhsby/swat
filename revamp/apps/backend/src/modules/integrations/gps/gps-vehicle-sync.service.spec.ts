import { BadRequestException } from '@nestjs/common';

import { type GpsDeviceRepository } from './gps-device.repository';
import { normalizePlate, GpsVehicleSyncService } from './gps-vehicle-sync.service';
import { type GpsidClientService, type GpsidVehicle } from './gpsid-client.service';

const V1 = '00000000-0000-0000-0000-0000000000a1';
const V2 = '00000000-0000-0000-0000-0000000000a2';

function makeService(opts: {
  isConfigured?: boolean;
  remote?: GpsidVehicle[];
  plates?: Array<{ id: string; plateNumber: string }>;
  devicesByImei?: Record<
    string,
    { id: string; vehicleId: string; active: boolean; deviceType: string } | null
  >;
  activeHardwareByVehicle?: Record<string, { id: string } | null>;
}): {
  service: GpsVehicleSyncService;
  repo: Record<string, jest.Mock>;
  gpsid: { isConfigured: boolean; getVehicles: jest.Mock };
} {
  const repo = {
    listVehiclePlates: jest.fn().mockResolvedValue(opts.plates ?? []),
    findDeviceForSync: jest
      .fn()
      .mockImplementation((imei: string) => Promise.resolve(opts.devicesByImei?.[imei] ?? null)),
    findActiveHardwareForVehicle: jest
      .fn()
      .mockImplementation((vid: string) =>
        Promise.resolve(opts.activeHardwareByVehicle?.[vid] ?? null),
      ),
    create: jest.fn().mockResolvedValue({ id: 'new' }),
    update: jest.fn().mockResolvedValue({ id: 'upd' }),
    deleteUnmatchedForImei: jest.fn().mockResolvedValue({ count: 0 }),
  };
  const gpsid = {
    isConfigured: opts.isConfigured ?? true,
    getVehicles: jest.fn().mockResolvedValue(opts.remote ?? []),
  };
  const service = new GpsVehicleSyncService(
    repo as unknown as GpsDeviceRepository,
    gpsid as unknown as GpsidClientService,
  );
  return { service, repo, gpsid };
}

describe('normalizePlate', () => {
  it('strips whitespace and upper-cases', () => {
    expect(normalizePlate('l 1234 ab')).toBe('L1234AB');
    expect(normalizePlate('L1234AB')).toBe('L1234AB');
    expect(normalizePlate(' l1234ab ')).toBe('L1234AB');
  });
});

describe('GpsVehicleSyncService', () => {
  it('throws when GPS.id is not configured', async () => {
    const { service } = makeService({ isConfigured: false });
    await expect(service.sync()).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a device for an unknown IMEI whose plate matches a vehicle', async () => {
    const { service, repo } = makeService({
      remote: [{ imei: '350000000000001', plate: 'L 1234 AB' }],
      plates: [{ id: V1, plateNumber: 'L1234AB' }],
    });
    const result = await service.sync();
    expect(result.createdCount).toBe(1);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: '350000000000001',
        imei: '350000000000001',
        provider: 'gpsid',
        active: true,
        vehicle: { connect: { id: V1 } },
      }),
    );
    // A newly linked IMEI is cleared from the unmatched queue.
    expect(repo.deleteUnmatchedForImei).toHaveBeenCalledWith('350000000000001');
  });

  it('matches despite plate spacing/case differences', async () => {
    const { service, repo } = makeService({
      remote: [{ imei: '111', plate: 'l1234ab' }],
      plates: [{ id: V1, plateNumber: 'L 1234 AB' }],
    });
    const result = await service.sync();
    expect(result.createdCount).toBe(1);
    expect(repo.create).toHaveBeenCalled();
  });

  it('remaps a known IMEI to the plate’s vehicle', async () => {
    const { service, repo } = makeService({
      remote: [{ imei: '222', plate: 'L 5678 CD' }],
      plates: [{ id: V2, plateNumber: 'L5678CD' }],
      devicesByImei: { '222': { id: 'd222', vehicleId: V1, active: true, deviceType: 'gps-hardware' } },
    });
    const result = await service.sync();
    expect(result.remappedCount).toBe(1);
    expect(result.remapped[0]).toMatchObject({ vehicleId: V2, inactiveDueToConflict: false });
    expect(repo.update).toHaveBeenCalledWith('d222', { vehicle: { connect: { id: V2 } } });
  });

  it('counts an IMEI already on the right vehicle as unchanged', async () => {
    const { service, repo } = makeService({
      remote: [{ imei: '333', plate: 'L1' }],
      plates: [{ id: V1, plateNumber: 'L1' }],
      devicesByImei: { '333': { id: 'd333', vehicleId: V1, active: true, deviceType: 'gps-hardware' } },
    });
    const result = await service.sync();
    expect(result.unchangedCount).toBe(1);
    expect(repo.update).not.toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('reports a GPS.id vehicle whose plate has no SWAT vehicle', async () => {
    const { service } = makeService({
      remote: [{ imei: '444', plate: 'X9999ZZ' }],
      plates: [{ id: V1, plateNumber: 'L1' }],
    });
    const result = await service.sync();
    expect(result.unmatchedVehicles).toEqual([{ imei: '444', plate: 'X9999ZZ' }]);
    expect(result.createdCount).toBe(0);
  });

  it('skips a roster row with no plate', async () => {
    const { service } = makeService({
      remote: [{ imei: '555', plate: null }],
      plates: [{ id: V1, plateNumber: 'L1' }],
    });
    const result = await service.sync();
    expect(result.skippedNoPlateCount).toBe(1);
  });

  it('lands a new device inactive when the vehicle already has active hardware', async () => {
    const { service, repo } = makeService({
      remote: [{ imei: '666', plate: 'L1' }],
      plates: [{ id: V1, plateNumber: 'L1' }],
      activeHardwareByVehicle: { [V1]: { id: 'existing' } },
    });
    const result = await service.sync();
    expect(result.createdCount).toBe(1);
    expect(result.conflictCount).toBe(1);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ active: false }));
  });
});
