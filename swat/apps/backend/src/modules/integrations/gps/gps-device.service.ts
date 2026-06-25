import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { paginated } from '../../../common/pagination';
import { type PaginationMeta } from '../../../common/types/api-response';

import { type CreateGpsDeviceDto } from './dto/create-gps-device.dto';
import { type ListGpsDevicesQueryDto } from './dto/list-gps-devices.query.dto';
import { type MapUnmatchedPingDto } from './dto/map-unmatched-ping.dto';
import { type UpdateGpsDeviceDto } from './dto/update-gps-device.dto';
import { GpsDeviceRepository, type GpsDeviceWithVehicle } from './gps-device.repository';

export interface GpsDeviceDto {
  readonly id: string;
  readonly vehicleId: string;
  readonly vehiclePlate: string;
  readonly deviceType: string;
  readonly deviceId: string;
  readonly imei: string | null;
  readonly provider: string;
  readonly priority: number;
  readonly active: boolean;
  readonly status: string;
  readonly lastPingAt: string | null;
  readonly lastLat: number | null;
  readonly lastLng: number | null;
  readonly lastSpeedKmh: number | null;
  readonly lastHeading: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface UnmatchedPingDto {
  readonly imei: string;
  readonly count: number;
  readonly lastReceivedAt: string;
}

function num(value: { toNumber(): number } | null): number | null {
  return value === null ? null : value.toNumber();
}

function toDto(device: GpsDeviceWithVehicle): GpsDeviceDto {
  return {
    id: device.id,
    vehicleId: device.vehicleId,
    vehiclePlate: device.vehicle.plateNumber,
    deviceType: device.deviceType,
    deviceId: device.deviceId,
    imei: device.imei,
    provider: device.provider,
    priority: device.priority,
    active: device.active,
    status: device.status,
    lastPingAt: device.lastPingAt?.toISOString() ?? null,
    lastLat: num(device.lastLat),
    lastLng: num(device.lastLng),
    lastSpeedKmh: num(device.lastSpeedKmh),
    lastHeading: device.lastHeading,
    createdAt: device.createdAt.toISOString(),
    updatedAt: device.updatedAt.toISOString(),
  };
}

@Injectable()
export class GpsDeviceService {
  constructor(private readonly repo: GpsDeviceRepository) {}

  async list(
    query: ListGpsDevicesQueryDto,
  ): Promise<{ data: GpsDeviceDto[]; meta: PaginationMeta }> {
    const { rows, total } = await this.repo.list({
      page: query.page,
      limit: query.limit,
      vehicleId: query.vehicleId,
      status: query.status,
      active: query.active,
      search: query.search,
    });
    return paginated(rows.map(toDto), total, query);
  }

  async getById(id: string): Promise<GpsDeviceDto> {
    const device = await this.repo.findById(id);
    if (!device) {
      throw new NotFoundException('Perangkat GPS tidak ditemukan.');
    }
    return toDto(device);
  }

  async create(dto: CreateGpsDeviceDto): Promise<GpsDeviceDto> {
    const deviceType = dto.deviceType ?? 'gps-hardware';
    // For hardware the IMEI is the device id when not given separately.
    const imei = dto.imei ?? (deviceType === 'gps-hardware' ? dto.deviceId : undefined);

    await this.assertVehicleExists(dto.vehicleId);
    await this.assertDeviceIdFree(dto.deviceId);
    if (deviceType === 'gps-hardware') {
      await this.assertNoActiveHardware(dto.vehicleId);
    }

    const device = await this.repo.create({
      vehicle: { connect: { id: dto.vehicleId } },
      deviceType,
      deviceId: dto.deviceId,
      ...(imei !== undefined ? { imei } : {}),
      ...(dto.provider !== undefined ? { provider: dto.provider } : {}),
      ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
    });
    return toDto(device);
  }

  async update(id: string, dto: UpdateGpsDeviceDto): Promise<GpsDeviceDto> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException('Perangkat GPS tidak ditemukan.');
    }
    if (dto.vehicleId !== undefined && dto.vehicleId !== existing.vehicleId) {
      await this.assertVehicleExists(dto.vehicleId);
    }
    if (dto.deviceId !== undefined && dto.deviceId !== existing.deviceId) {
      await this.assertDeviceIdFree(dto.deviceId);
    }
    // Re-check the "one active hardware per vehicle" rule when the change could
    // create a second active hardware tracker on a vehicle.
    const nextVehicleId = dto.vehicleId ?? existing.vehicleId;
    const nextType = dto.deviceType ?? existing.deviceType;
    const nextActive = dto.active ?? existing.active;
    if (
      nextType === 'gps-hardware' &&
      nextActive &&
      (dto.vehicleId !== undefined || dto.deviceType !== undefined || dto.active !== undefined)
    ) {
      await this.assertNoActiveHardware(nextVehicleId, id);
    }

    const device = await this.repo.update(id, {
      ...(dto.vehicleId !== undefined ? { vehicle: { connect: { id: dto.vehicleId } } } : {}),
      ...(dto.deviceType !== undefined ? { deviceType: dto.deviceType } : {}),
      ...(dto.deviceId !== undefined ? { deviceId: dto.deviceId } : {}),
      ...(dto.imei !== undefined ? { imei: dto.imei } : {}),
      ...(dto.provider !== undefined ? { provider: dto.provider } : {}),
      ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
      ...(dto.active !== undefined ? { active: dto.active } : {}),
    });
    return toDto(device);
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.getById(id);
    await this.repo.delete(id);
    return { message: 'Perangkat GPS telah dilepas.' };
  }

  async listUnmatched(
    query: ListGpsDevicesQueryDto,
  ): Promise<{ data: UnmatchedPingDto[]; meta: PaginationMeta }> {
    const { rows, total } = await this.repo.listUnmatched({ page: query.page, limit: query.limit });
    const data = rows.map((r) => ({
      imei: r.imei,
      count: r.count,
      lastReceivedAt: r.lastReceivedAt.toISOString(),
    }));
    return paginated(data, total, query);
  }

  async mapUnmatched(dto: MapUnmatchedPingDto): Promise<GpsDeviceDto> {
    const queued = await this.repo.countUnmatchedForImei(dto.imei);
    if (queued === 0) {
      throw new NotFoundException('IMEI tidak ada di antrean perangkat tak dikenal.');
    }
    await this.assertVehicleExists(dto.vehicleId);
    await this.assertDeviceIdFree(dto.imei);
    await this.assertNoActiveHardware(dto.vehicleId);

    const device = await this.repo.create({
      vehicle: { connect: { id: dto.vehicleId } },
      deviceType: 'gps-hardware',
      deviceId: dto.imei,
      imei: dto.imei,
    });
    // Clear the queue for this IMEI — subsequent pings now resolve to the device.
    await this.repo.deleteUnmatchedForImei(dto.imei);
    return toDto(device);
  }

  private async assertVehicleExists(vehicleId: string): Promise<void> {
    const vehicle = await this.repo.vehicleExists(vehicleId);
    if (!vehicle) {
      throw new BadRequestException('Kendaraan tidak ditemukan.');
    }
  }

  private async assertDeviceIdFree(deviceId: string): Promise<void> {
    const duplicate = await this.repo.findByDeviceId(deviceId);
    if (duplicate) {
      throw new ConflictException('ID perangkat (IMEI) sudah terdaftar.');
    }
  }

  private async assertNoActiveHardware(vehicleId: string, exceptId?: string): Promise<void> {
    const existing = await this.repo.findActiveHardwareForVehicle(vehicleId);
    if (existing && existing.id !== exceptId) {
      throw new ConflictException('Kendaraan ini sudah memiliki perangkat GPS aktif.');
    }
  }
}
