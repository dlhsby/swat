import { Injectable, NotFoundException } from '@nestjs/common';
import { type DeviationSeverity, type DeviationType } from '@prisma/client';

import { paginated } from '../../../common/pagination';
import { type PaginationMeta } from '../../../common/types/api-response';

import {
  DeviationAlertRepository,
  type DeviationAlertWithVehicle,
} from './deviation-alert.repository';
import { type ListAlertsQueryDto } from './dto/list-alerts.query.dto';
import { GpsAlertPublisher } from './gps-alert.publisher';

export interface DeviationAlertDto {
  readonly id: string;
  readonly vehicleId: string;
  readonly vehiclePlate: string;
  readonly tripId: string | null;
  readonly alertType: string;
  readonly severity: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly distanceM: number | null;
  readonly pingCount: number;
  readonly isAcknowledged: boolean;
  readonly acknowledgedAt: string | null;
  readonly resolvedAt: string | null;
  readonly notes: string | null;
  readonly createdAt: string;
}

export interface RaiseDeviationInput {
  readonly vehicleId: string;
  readonly tripId: string | null;
  readonly alertType: DeviationType;
  readonly severity: DeviationSeverity;
  readonly latitude: number;
  readonly longitude: number;
  readonly distanceM: number | null;
}

function toDto(a: DeviationAlertWithVehicle): DeviationAlertDto {
  return {
    id: a.id,
    vehicleId: a.vehicleId,
    vehiclePlate: a.vehicle.plateNumber,
    tripId: a.tripId,
    alertType: a.alertType,
    severity: a.severity,
    latitude: a.latitude.toNumber(),
    longitude: a.longitude.toNumber(),
    distanceM: a.distanceM,
    pingCount: a.pingCount,
    isAcknowledged: a.isAcknowledged,
    acknowledgedAt: a.acknowledgedAt?.toISOString() ?? null,
    resolvedAt: a.resolvedAt?.toISOString() ?? null,
    notes: a.notes,
    createdAt: a.createdAt.toISOString(),
  };
}

@Injectable()
export class DeviationAlertService {
  constructor(
    private readonly repo: DeviationAlertRepository,
    private readonly publisher: GpsAlertPublisher,
  ) {}

  /**
   * Raise a deviation, or coalesce into the open alert of the same type for the
   * vehicle (one alert + a ping counter — never a flapping stream). A freshly
   * raised alert is published to `gps:alerts`.
   */
  async raiseOrCoalesce(input: RaiseDeviationInput): Promise<void> {
    const open = await this.repo.findOpen(input.vehicleId, input.alertType);
    if (open) {
      await this.repo.incrementPingCount(open.id);
      return;
    }
    const alert = await this.repo.create({
      vehicle: { connect: { id: input.vehicleId } },
      tripId: input.tripId,
      alertType: input.alertType,
      severity: input.severity,
      latitude: input.latitude,
      longitude: input.longitude,
      distanceM: input.distanceM,
    });
    await this.publisher.publish({
      id: alert.id,
      vehicleId: alert.vehicleId,
      tripId: alert.tripId,
      alertType: alert.alertType,
      severity: alert.severity,
      latitude: alert.latitude.toNumber(),
      longitude: alert.longitude.toNumber(),
      distanceM: alert.distanceM,
      createdAt: alert.createdAt.toISOString(),
    });
  }

  /** Auto-resolve open alerts of a type for a vehicle (condition cleared). */
  autoResolve(vehicleId: string, alertType: DeviationType): Promise<number> {
    return this.repo.resolveOpen(vehicleId, alertType);
  }

  async list(
    query: ListAlertsQueryDto,
  ): Promise<{ data: DeviationAlertDto[]; meta: PaginationMeta }> {
    const { rows, total } = await this.repo.list({
      page: query.page,
      limit: query.limit,
      vehicleId: query.vehicleId,
      acknowledged: query.acknowledged,
      resolved: query.resolved,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
    return paginated(rows.map(toDto), total, query);
  }

  async acknowledge(id: string, userId: string | null, notes?: string): Promise<DeviationAlertDto> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException('Peringatan deviasi tidak ditemukan.');
    }
    const updated = await this.repo.acknowledge(id, userId, notes ?? null);
    return toDto(updated);
  }
}
