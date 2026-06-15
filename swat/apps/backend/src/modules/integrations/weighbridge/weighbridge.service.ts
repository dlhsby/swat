import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { paginated, toSkipTake } from '../../../common/pagination';
import { type PaginationMeta } from '../../../common/types/api-response';
import { PrismaService } from '../../prisma/prisma.service';
import { TripFinderService } from '../../transactions/trip-finder.service';
import { type ApiPrincipal } from '../types/principal';

import { type ListWeighingsQueryDto } from './dto/list-weighings.query.dto';
import { type PostWeighingDto } from './dto/post-weighing.dto';
import { type ResolveKitirDto } from './dto/resolve-kitir.dto';
import { type UpdateWeighingDto } from './dto/update-weighing.dto';
import { IdempotencyService } from './idempotency.service';
import { TpaInboundLogService } from './tpa-inbound-log.service';
import { parseIsoDate, WeighbridgeResolutionService } from './weighbridge-resolution.service';
import { WeighbridgeValidationService } from './weighbridge-validation.service';
import { type PermitWithVehicleAndSite } from './weighbridge.repository';
import {
  type ResolvedKitir,
  type WeighingListItem,
  type WeighingResult,
} from './weighbridge.types';

/** Recorder id for the Trip — only USER principals map to a real User FK. */
function recorderId(principal: ApiPrincipal): string | null {
  return principal.type === 'USER' ? principal.id : null;
}

@Injectable()
export class WeighbridgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolution: WeighbridgeResolutionService,
    private readonly validation: WeighbridgeValidationService,
    private readonly tripFinder: TripFinderService,
    private readonly inboundLog: TpaInboundLogService,
    private readonly idempotency: IdempotencyService,
  ) {}

  resolveKitir(dto: ResolveKitirDto): Promise<ResolvedKitir> {
    return this.resolution.resolveKitir({ code: dto.code, plateNumber: dto.plateNumber }, dto.date);
  }

  async postWeighing(
    dto: PostWeighingDto,
    principal: ApiPrincipal,
    idempotencyKey?: string,
  ): Promise<WeighingResult> {
    if (idempotencyKey) {
      const cached = await this.idempotency.get<WeighingResult>(idempotencyKey);
      if (cached) {
        return cached;
      }
    }

    const permit = dto.kitirId
      ? await this.resolution.requireActivePermitById(dto.kitirId, dto.date)
      : await this.resolution.requireActivePermitByPlate(dto.plateNumber, dto.date);

    if (permit.vehicle.plateNumber !== dto.plateNumber) {
      throw new ConflictException('Nomor polisi tidak sesuai dengan kitir');
    }

    const check = this.validation.validateWeighing(
      dto.grossWeight,
      dto.tareWeight,
      dto.wasteVolume,
      {
        maxNetLoad: permit.vehicle.model.maxNetLoad ?? 0,
        maxNetVolume: permit.vehicle.model.maxNetVolume ?? 0,
      },
    );
    if (!check.valid) {
      throw new UnprocessableEntityException(check.error ?? 'Data penimbangan tidak valid');
    }

    const operationDate = parseIsoDate(dto.date);
    const transactionDay = await this.prisma.transactionDay.findUnique({
      where: { date: operationDate },
      select: { id: true },
    });
    if (!transactionDay) {
      throw new NotFoundException('Hari transaksi tidak ditemukan');
    }

    const { trip } = await this.tripFinder.findOrCreateDisposalTrip({
      vehicleId: permit.vehicle.id,
      transactionDayId: transactionDay.id,
      operationDate,
      tpaSiteId: permit.site.id,
      tpaSiteName: permit.site.name,
    });

    const actualTime = dto.timestamp ? new Date(dto.timestamp) : new Date();
    const recordedAt = new Date();
    const recordedById = recorderId(principal);

    await this.prisma.trip.update({
      where: { id: trip.id },
      data: {
        tareWeight: dto.tareWeight,
        grossWeight: dto.grossWeight,
        netWeight: check.netWeight,
        wasteVolume: dto.wasteVolume ?? 0,
        actualTime,
        status: dto.verified ? 'VERIFIED' : 'DONE',
        notes: `[Weighbridge] ${dto.notes ?? dto.cctvReference ?? ''}`.trim(),
        recordedById,
        updatedById: recordedById,
        ...(dto.verified ? { verifiedById: recordedById, verifiedAt: recordedAt } : {}),
      },
    });

    await this.inboundLog.create({
      dateLabel: dto.date,
      date: operationDate,
      plateNumber: dto.plateNumber,
      depot: null,
      grossWeight: dto.grossWeight,
      tareWeight: dto.tareWeight,
      netWeight: check.netWeight,
      cctvReference: dto.cctvReference ?? null,
      tripId: trip.id,
    });

    const result: WeighingResult = {
      id: trip.id,
      kitirId: permit.id,
      tripId: trip.id,
      netWeight: check.netWeight,
      recordedAt: recordedAt.toISOString(),
      cctvReference: dto.cctvReference ?? null,
    };
    if (idempotencyKey) {
      await this.idempotency.store(idempotencyKey, result);
    }
    return result;
  }

  /** Update an existing DISPOSAL weighing (parity: updatePembuanganTerverifikasi). */
  async updateWeighing(
    tripId: string,
    dto: UpdateWeighingDto,
    principal: ApiPrincipal,
  ): Promise<WeighingResult> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        grossWeight: true,
        tareWeight: true,
        wasteVolume: true,
        operationDate: true,
      },
    });
    if (!trip) {
      throw new NotFoundException('Penimbangan tidak ditemukan');
    }

    const grossWeight = dto.grossWeight ?? trip.grossWeight;
    const tareWeight = dto.tareWeight ?? trip.tareWeight;
    if (grossWeight == null || tareWeight == null) {
      throw new UnprocessableEntityException(
        'Berat belum tercatat untuk penimbangan ini; sertakan grossWeight dan tareWeight',
      );
    }
    const check = this.validation.validateWeighing(
      grossWeight,
      tareWeight,
      dto.wasteVolume ?? trip.wasteVolume ?? undefined,
      { maxNetLoad: 0, maxNetVolume: 0 },
    );
    if (!check.valid) {
      throw new UnprocessableEntityException(check.error ?? 'Data penimbangan tidak valid');
    }

    const recordedById = recorderId(principal);
    const recordedAt = new Date();
    await this.prisma.trip.update({
      where: { id: tripId },
      data: {
        grossWeight,
        tareWeight,
        netWeight: check.netWeight,
        ...(dto.wasteVolume !== undefined ? { wasteVolume: dto.wasteVolume } : {}),
        ...(dto.notes !== undefined ? { notes: `[Weighbridge] ${dto.notes}`.trim() } : {}),
        updatedById: recordedById,
        ...(dto.verified
          ? { status: 'VERIFIED', verifiedById: recordedById, verifiedAt: recordedAt }
          : {}),
      },
    });

    await this.inboundLog.updateByTripId(tripId, {
      grossWeight,
      tareWeight,
      netWeight: check.netWeight,
      ...(dto.cctvReference !== undefined ? { cctvReference: dto.cctvReference } : {}),
    });

    return {
      id: tripId,
      kitirId: null,
      tripId,
      netWeight: check.netWeight,
      recordedAt: recordedAt.toISOString(),
      cctvReference: dto.cctvReference ?? null,
    };
  }

  /** Paginated read over recorded DISPOSAL weighings (parity: getpembuangansampahbyfilter). */
  async listWeighings(
    query: ListWeighingsQueryDto,
  ): Promise<{ data: WeighingListItem[]; meta: PaginationMeta }> {
    const where = {
      route: {
        category: 'DISPOSAL' as const,
        ...(query.siteId ? { destinationSiteId: query.siteId } : {}),
      },
      ...(query.date ? { operationDate: parseIsoDate(query.date) } : {}),
      ...(query.plateNumber
        ? { haulAssignment: { haul: { vehicle: { plateNumber: query.plateNumber } } } }
        : {}),
    };
    const { skip, take } = toSkipTake(query);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.trip.findMany({
        where,
        include: {
          route: { select: { destinationSite: { select: { id: true, name: true } } } },
          haulAssignment: {
            select: { haul: { select: { vehicle: { select: { plateNumber: true } } } } },
          },
        },
        orderBy: { operationDate: 'desc' },
        skip,
        take,
      }),
      this.prisma.trip.count({ where }),
    ]);

    // cctvReference lives on the linked TpaInboundLog (not the Trip); fetch the
    // page's references in one query and map them in.
    const tripIds = rows.map((trip) => trip.id);
    const logs =
      tripIds.length > 0
        ? await this.prisma.tpaInboundLog.findMany({
            where: { tripId: { in: tripIds } },
            select: { tripId: true, cctvReference: true },
          })
        : [];
    const cctvByTrip = new Map(logs.map((log) => [log.tripId, log.cctvReference]));

    const data: WeighingListItem[] = rows.map((trip) => ({
      tripId: trip.id,
      date: trip.operationDate.toISOString().slice(0, 10),
      plateNumber: trip.haulAssignment.haul.vehicle.plateNumber,
      siteId: trip.route?.destinationSite?.id ?? null,
      siteName: trip.route?.destinationSite?.name ?? null,
      grossWeight: trip.grossWeight,
      tareWeight: trip.tareWeight,
      netWeight: trip.netWeight,
      wasteVolume: trip.wasteVolume,
      status: trip.status,
      cctvReference: cctvByTrip.get(trip.id) ?? null,
      recordedAt: (trip.actualTime ?? trip.updatedAt).toISOString(),
    }));
    return paginated(data, total, query);
  }
}

// Re-export so the controller can reference the permit type if needed.
export type { PermitWithVehicleAndSite };
