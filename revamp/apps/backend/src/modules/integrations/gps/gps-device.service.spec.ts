import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

import { type GpsDeviceRepository } from './gps-device.repository';
import { GpsDeviceService } from './gps-device.service';

const VEHICLE_ID = '00000000-0000-0000-0000-0000000000a1';
const DEVICE_ID = '00000000-0000-0000-0000-0000000000d1';

function buildDevice(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: DEVICE_ID,
    vehicleId: VEHICLE_ID,
    deviceType: 'gps-hardware',
    deviceId: '350000000000001',
    imei: '350000000000001',
    provider: 'gpsid',
    priority: 0,
    active: true,
    status: 'online',
    lastPingAt: new Date('2026-06-25T10:00:00Z'),
    lastLat: { toNumber: () => -7.2575 },
    lastLng: { toNumber: () => 112.7521 },
    lastSpeedKmh: { toNumber: () => 12.5 },
    lastHeading: 90,
    createdAt: new Date('2026-06-01T00:00:00Z'),
    updatedAt: new Date('2026-06-01T00:00:00Z'),
    vehicle: { id: VEHICLE_ID, plateNumber: 'L 1234 AB' },
    ...overrides,
  };
}

describe('GpsDeviceService', () => {
  let repo: {
    list: jest.Mock;
    findById: jest.Mock;
    findByDeviceId: jest.Mock;
    findActiveHardwareForVehicle: jest.Mock;
    vehicleExists: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    listUnmatched: jest.Mock;
    countUnmatchedForImei: jest.Mock;
    deleteUnmatchedForImei: jest.Mock;
  };
  let service: GpsDeviceService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = {
      list: jest.fn(),
      findById: jest.fn(),
      findByDeviceId: jest.fn().mockResolvedValue(null),
      findActiveHardwareForVehicle: jest.fn().mockResolvedValue(null),
      vehicleExists: jest.fn().mockResolvedValue({ id: VEHICLE_ID }),
      create: jest.fn().mockResolvedValue(buildDevice()),
      update: jest.fn().mockResolvedValue(buildDevice()),
      delete: jest.fn().mockResolvedValue(buildDevice()),
      listUnmatched: jest.fn(),
      countUnmatchedForImei: jest.fn(),
      deleteUnmatchedForImei: jest.fn().mockResolvedValue({ count: 3 }),
    };
    service = new GpsDeviceService(repo as unknown as GpsDeviceRepository);
  });

  describe('list', () => {
    it('maps rows to DTOs with pagination meta', async () => {
      repo.list.mockResolvedValue({ rows: [buildDevice()], total: 1 });
      const result = await service.list({ page: 1, limit: 20 } as never);
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 20 });
      expect(result.data[0]).toMatchObject({
        vehiclePlate: 'L 1234 AB',
        deviceId: '350000000000001',
        lastLat: -7.2575,
        status: 'online',
      });
    });

    it('returns null decimals as null', async () => {
      repo.list.mockResolvedValue({
        rows: [buildDevice({ lastLat: null, lastLng: null, lastSpeedKmh: null, lastPingAt: null })],
        total: 1,
      });
      const result = await service.list({ page: 1, limit: 20 } as never);
      expect(result.data[0]?.lastLat).toBeNull();
      expect(result.data[0]?.lastPingAt).toBeNull();
    });
  });

  describe('getById', () => {
    it('returns the device when found', async () => {
      repo.findById.mockResolvedValue(buildDevice());
      await expect(service.getById(DEVICE_ID)).resolves.toMatchObject({ id: DEVICE_ID });
    });

    it('throws NotFound when missing', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.getById(DEVICE_ID)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a hardware device, defaulting imei to deviceId', async () => {
      await service.create({ vehicleId: VEHICLE_ID, deviceId: '350000000000001' } as never);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceType: 'gps-hardware',
          deviceId: '350000000000001',
          imei: '350000000000001',
        }),
      );
    });

    it('rejects an unknown vehicle', async () => {
      repo.vehicleExists.mockResolvedValue(null);
      await expect(
        service.create({ vehicleId: VEHICLE_ID, deviceId: 'x' } as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a duplicate device id', async () => {
      repo.findByDeviceId.mockResolvedValue({ id: 'other' });
      await expect(
        service.create({ vehicleId: VEHICLE_ID, deviceId: 'dup' } as never),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects a second active hardware tracker on a vehicle', async () => {
      repo.findActiveHardwareForVehicle.mockResolvedValue({ id: 'existing' });
      await expect(
        service.create({ vehicleId: VEHICLE_ID, deviceId: 'new' } as never),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('does not run the hardware check for a mobile-app source', async () => {
      await service.create({
        vehicleId: VEHICLE_ID,
        deviceId: 'app-1',
        deviceType: 'mobile-app',
      } as never);
      expect(repo.findActiveHardwareForVehicle).not.toHaveBeenCalled();
    });

    it('passes an explicit active flag through to the repository', async () => {
      await service.create({
        vehicleId: VEHICLE_ID,
        deviceId: '350000000000002',
        active: true,
      } as never);
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ active: true }));
    });

    it('registers an inactive spare without the one-active-hardware check', async () => {
      repo.findActiveHardwareForVehicle.mockResolvedValue({ id: 'existing' });
      await service.create({
        vehicleId: VEHICLE_ID,
        deviceId: 'spare-1',
        active: false,
      } as never);
      expect(repo.findActiveHardwareForVehicle).not.toHaveBeenCalled();
      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ active: false }));
    });
  });

  describe('update', () => {
    it('throws NotFound when the device is missing', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.update(DEVICE_ID, { priority: 1 })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('checks the hardware rule when reassigning to another vehicle', async () => {
      repo.findById.mockResolvedValue(buildDevice());
      const otherVehicle = '00000000-0000-0000-0000-0000000000a2';
      repo.findActiveHardwareForVehicle.mockResolvedValue({ id: 'existing' });
      await expect(service.update(DEVICE_ID, { vehicleId: otherVehicle })).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repo.vehicleExists).toHaveBeenCalledWith(otherVehicle);
    });

    it('updates supplied fields', async () => {
      repo.findById.mockResolvedValue(buildDevice());
      await service.update(DEVICE_ID, { priority: 5, active: false });
      expect(repo.update).toHaveBeenCalledWith(DEVICE_ID, { priority: 5, active: false });
    });
  });

  describe('remove', () => {
    it('detaches an existing device', async () => {
      repo.findById.mockResolvedValue(buildDevice());
      await expect(service.remove(DEVICE_ID)).resolves.toEqual({
        message: 'Perangkat GPS telah dilepas.',
      });
      expect(repo.delete).toHaveBeenCalledWith(DEVICE_ID);
    });
  });

  describe('listUnmatched', () => {
    it('maps the queue to DTOs', async () => {
      repo.listUnmatched.mockResolvedValue({
        rows: [{ imei: '999', count: 4, lastReceivedAt: new Date('2026-06-25T09:00:00Z') }],
        total: 1,
      });
      const result = await service.listUnmatched({ page: 1, limit: 20 } as never);
      expect(result.data[0]).toEqual({
        imei: '999',
        count: 4,
        lastReceivedAt: '2026-06-25T09:00:00.000Z',
      });
    });
  });

  describe('mapUnmatched', () => {
    it('creates a device and clears the queue for the IMEI', async () => {
      repo.countUnmatchedForImei.mockResolvedValue(3);
      await service.mapUnmatched({ imei: '350000000000099', vehicleId: VEHICLE_ID });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ deviceType: 'gps-hardware', deviceId: '350000000000099' }),
      );
      expect(repo.deleteUnmatchedForImei).toHaveBeenCalledWith('350000000000099');
    });

    it('rejects an IMEI not in the queue', async () => {
      repo.countUnmatchedForImei.mockResolvedValue(0);
      await expect(
        service.mapUnmatched({ imei: '111', vehicleId: VEHICLE_ID }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('rejects when the IMEI is already a registered device', async () => {
      repo.countUnmatchedForImei.mockResolvedValue(2);
      repo.findByDeviceId.mockResolvedValue({ id: 'existing' });
      await expect(
        service.mapUnmatched({ imei: '222', vehicleId: VEHICLE_ID }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
