import { BadRequestException } from '@nestjs/common';

import { type GpsDeviceRepository } from './gps-device.repository';
import { extractPlate, GpsVehicleSyncService } from './gps-vehicle-sync.service';
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
  existingDeviceIds?: string[];
  queuedImeis?: string[];
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
    deactivateDevice: jest.fn().mockResolvedValue({ id: 'deact' }),
    deleteUnmatchedForImei: jest.fn().mockResolvedValue({ count: 0 }),
    listDeviceIds: jest.fn().mockResolvedValue(opts.existingDeviceIds ?? []),
    listQueuedImeis: jest.fn().mockResolvedValue(opts.queuedImeis ?? []),
    addUnmatchedPings: jest.fn().mockResolvedValue({ count: 0 }),
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

describe('extractPlate', () => {
  it('normalizes clean plates (whitespace/case)', () => {
    expect(extractPlate('l 1234 ab')).toBe('L1234AB');
    expect(extractPlate('L1234AB')).toBe('L1234AB');
    expect(extractPlate(' l1234ab ')).toBe('L1234AB');
    expect(extractPlate('L8048SP')).toBe('L8048SP');
  });

  it('extracts the plate from a GPS.id type-name (plate is last)', () => {
    // The real vendor shape: "<body> <size>-<plate>".
    expect(extractPlate('ARMROLL 14M3-B 9552 EQ')).toBe('B9552EQ');
    expect(extractPlate('DUMP TRUCK-L 1234 AB')).toBe('L1234AB');
  });

  it('strips the legacy dedup suffix so both sides agree', () => {
    expect(extractPlate('B9552EQ#43')).toBe('B9552EQ');
    // GPS.id name and the suffixed legacy plate reduce to the same key.
    expect(extractPlate('ARMROLL 14M3-B 9552 EQ')).toBe(extractPlate('B9552EQ#43'));
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

  it('matches a real GPS.id type-name to a suffixed legacy plate and creates the device', async () => {
    // The exact shape from GPS.id: imei + "<body> <size>-<plate>" vs the legacy plate.
    const { service, repo } = makeService({
      remote: [{ imei: '860121060518621', plate: 'ARMROLL 14M3-B 9552 EQ' }],
      plates: [{ id: V1, plateNumber: 'B9552EQ#43' }],
    });
    const result = await service.sync();
    expect(result.createdCount).toBe(1);
    expect(result.unmatchedVehicles).toHaveLength(0);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: '860121060518621',
        vehicle: { connect: { id: V1 } },
      }),
    );
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
    expect(result.remapped[0]).toMatchObject({ vehicleId: V2, replacedPrior: false });
    expect(repo.update).toHaveBeenCalledWith('d222', {
      vehicle: { connect: { id: V2 } },
      active: true,
    });
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

  it('reports a GPS.id vehicle whose plate has no SWAT vehicle and queues its IMEI', async () => {
    const { service, repo } = makeService({
      remote: [{ imei: '444', plate: 'X9999ZZ' }],
      plates: [{ id: V1, plateNumber: 'L1' }],
    });
    const result = await service.sync();
    expect(result.unmatchedVehicles).toEqual([{ imei: '444', plate: 'X9999ZZ' }]);
    expect(result.createdCount).toBe(0);
    expect(result.queuedUnknownCount).toBe(1);
    expect(repo.addUnmatchedPings).toHaveBeenCalledWith([
      { imei: '444', payload: { VehicleNumber: 'X9999ZZ', source: 'gpsid-roster' } },
    ]);
  });

  it('does not re-queue an unmatched IMEI that is already a device or already queued', async () => {
    const { service, repo } = makeService({
      remote: [
        { imei: 'known-device', plate: 'X1' },
        { imei: 'already-queued', plate: 'X2' },
      ],
      plates: [{ id: V1, plateNumber: 'L1' }],
      existingDeviceIds: ['known-device'],
      queuedImeis: ['already-queued'],
    });
    const result = await service.sync();
    expect(result.unmatchedVehicles).toHaveLength(2);
    expect(result.queuedUnknownCount).toBe(0);
    expect(repo.addUnmatchedPings).not.toHaveBeenCalled();
  });

  it('skips a roster row with no plate', async () => {
    const { service } = makeService({
      remote: [{ imei: '555', plate: null }],
      plates: [{ id: V1, plateNumber: 'L1' }],
    });
    const result = await service.sync();
    expect(result.skippedNoPlateCount).toBe(1);
  });

  it('adds the new device as active and deactivates the prior tracker (1:many)', async () => {
    const { service, repo } = makeService({
      remote: [{ imei: '666', plate: 'L1' }],
      plates: [{ id: V1, plateNumber: 'L1' }],
      activeHardwareByVehicle: { [V1]: { id: 'existing' } },
    });
    const result = await service.sync();
    expect(result.createdCount).toBe(1);
    expect(result.replacedActiveCount).toBe(1);
    expect(result.created[0]).toMatchObject({ replacedPrior: true });
    // The prior active hardware is deactivated (retained), the new one is active.
    expect(repo.deactivateDevice).toHaveBeenCalledWith('existing');
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ active: true }));
  });

  it('creates an active device with no prior when the vehicle is untracked', async () => {
    const { service, repo } = makeService({
      remote: [{ imei: '777', plate: 'L1' }],
      plates: [{ id: V1, plateNumber: 'L1' }],
    });
    const result = await service.sync();
    expect(result.createdCount).toBe(1);
    expect(result.replacedActiveCount).toBe(0);
    expect(result.created[0]).toMatchObject({ replacedPrior: false });
    expect(repo.deactivateDevice).not.toHaveBeenCalled();
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ active: true }));
  });
});
