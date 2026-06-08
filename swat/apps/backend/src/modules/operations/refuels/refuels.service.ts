import { Injectable } from '@nestjs/common';

import { parseDateOnly } from '../../../common/dates';
import { paginated } from '../../../common/pagination';
import { type PaginationMeta } from '../../../common/types/api-response';

import { type ListRefuelsQueryDto } from './dto/list-refuels.query.dto';
import { RefuelsRepository, type RefuelTrip } from './refuels.repository';

export interface RefuelDto {
  readonly id: string;
  readonly operationDate: string;
  readonly status: string;
  readonly vehicleId: number;
  readonly vehiclePlate: string;
  readonly fuelId: number | null;
  readonly fuelName: string | null;
  readonly pricePerLiter: number | null;
  readonly requestedLiters: number | null;
  readonly approvedLiters: number | null;
  /** approvedLiters × pricePerLiter (IDR, rounded); null when either is unknown. */
  readonly estimatedCost: number | null;
  /** Approved less than requested — flagged for review. */
  readonly anomaly: boolean;
  readonly recordedByName: string | null;
}

const toNumber = (value: { toString(): string } | null): number | null =>
  value === null ? null : Number(value);

function toDto(trip: RefuelTrip): RefuelDto {
  const fuel = trip.haulAssignment.haul.vehicle.model.fuel;
  const requested = toNumber(trip.fuelRequestedLiters);
  const approved = toNumber(trip.fuelApprovedLiters);
  const pricePerLiter = fuel?.pricePerLiter ?? null;
  const estimatedCost =
    approved !== null && pricePerLiter !== null ? Math.round(approved * pricePerLiter) : null;
  return {
    id: trip.id.toString(),
    operationDate: trip.operationDate.toISOString().slice(0, 10),
    status: trip.status,
    vehicleId: trip.haulAssignment.haul.vehicleId,
    vehiclePlate: trip.haulAssignment.haul.vehicle.plateNumber,
    fuelId: fuel?.id ?? null,
    fuelName: fuel?.name ?? null,
    pricePerLiter,
    requestedLiters: requested,
    approvedLiters: approved,
    estimatedCost,
    anomaly: requested !== null && approved !== null && approved < requested,
    recordedByName: trip.recordedBy?.name ?? null,
  };
}

@Injectable()
export class RefuelsService {
  constructor(private readonly repo: RefuelsRepository) {}

  async list(query: ListRefuelsQueryDto): Promise<{ data: RefuelDto[]; meta: PaginationMeta }> {
    const { rows, total } = await this.repo.list({
      page: query.page,
      limit: query.limit,
      vehicleId: query.vehicleId,
      fuelId: query.fuelId,
      status: query.status,
      date: query.date ? parseDateOnly(query.date) : undefined,
    });
    return paginated(rows.map(toDto), total, query);
  }
}
