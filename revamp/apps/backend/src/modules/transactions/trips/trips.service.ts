import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type Prisma } from '@prisma/client';

import { hasPermission } from '../../../common/auth/permission-matcher';
import { RolePermissionsService } from '../../../common/auth/role-permissions.service';
import { type SessionUser } from '../../../common/auth/session.types';
import { anchorInstantToOperationDate } from '../../../common/dates';
import { RollupService } from '../../analytics/rollup.service';
import { AuditService } from '../../audit/audit.service';
import { TripFinderService } from '../trip-finder.service';

import { type CreateTripDto } from './dto/create-trip.dto';
import { type RecordTripDto } from './dto/record-trip.dto';
import { type TripDto, toTripDto } from './trip.mapper';
import { type TripForRecording, type TripFull, TripsRepository } from './trips.repository';

/** Route category → the permission required to record that trip type. */
const CATEGORY_PERMISSION: Readonly<Record<string, string>> = {
  REFUEL: 'trip:record-fuel',
  PICKUP: 'trip:record-pickup',
  DISPOSAL: 'trip:record-disposal',
  DEPART_POOL: 'trip:update',
  RETURN_POOL: 'trip:update',
};

export interface TripDetailDto extends TripDto {
  readonly haulAssignment: {
    readonly id: string;
    readonly driverId: string;
    readonly driverName: string;
    readonly haul: {
      readonly id: string;
      readonly vehicleId: string;
      readonly vehiclePlate: string;
      readonly transactionDay: {
        readonly id: string;
        readonly date: string;
        readonly status: string;
      };
    };
  };
}

function toDetailDto(trip: TripFull): TripDetailDto {
  const { haulAssignment } = trip;
  const { haul } = haulAssignment;
  return {
    ...toTripDto(trip),
    haulAssignment: {
      id: haulAssignment.id,
      driverId: haulAssignment.driverId,
      driverName: haulAssignment.driver.name,
      haul: {
        id: haul.id,
        vehicleId: haul.vehicleId,
        vehiclePlate: haul.vehicle.plateNumber,
        transactionDay: {
          id: haul.transactionDay.id,
          date: haul.transactionDay.date.toISOString().slice(0, 10),
          status: haul.transactionDay.status,
        },
      },
    },
  };
}

@Injectable()
export class TripsService {
  constructor(
    private readonly repo: TripsRepository,
    private readonly rolePermissions: RolePermissionsService,
    private readonly audit: AuditService,
    private readonly rollups: RollupService,
    private readonly tripFinder: TripFinderService,
  ) {}

  /**
   * Create an ad-hoc (unscheduled) trip on a haul assignment — legacy parity for
   * off-plan pickups/refuels/disposals. When both `actualTime` and
   * `actualOdometer` are supplied the trip is recorded (DONE) in the same call,
   * reusing `record()`; otherwise it is created IN_PROGRESS for later recording.
   */
  async create(dto: CreateTripDto, user: SessionUser): Promise<TripDto> {
    const wantsRecord = dto.actualTime !== undefined || dto.actualOdometer !== undefined;
    if (wantsRecord && (dto.actualTime === undefined || dto.actualOdometer === undefined)) {
      throw new BadRequestException(
        'actualTime dan actualOdometer harus diisi bersama untuk mencatat realisasi.',
      );
    }

    const trip = await this.tripFinder.createAdHocTrip({
      haulAssignmentId: dto.haulAssignmentId,
      routeId: dto.routeId,
      category: dto.category,
      destinationSiteId: dto.destinationSiteId,
      name: dto.name,
      createdById: user.id,
    });

    if (dto.actualTime !== undefined && dto.actualOdometer !== undefined) {
      const recordDto: RecordTripDto = {
        actualTime: dto.actualTime,
        actualOdometer: dto.actualOdometer,
        fuelRequestedLiters: dto.fuelRequestedLiters,
        fuelApprovedLiters: dto.fuelApprovedLiters,
        tareWeight: dto.tareWeight,
        grossWeight: dto.grossWeight,
        wasteVolume: dto.wasteVolume,
        notes: dto.notes,
      };
      return this.record(trip.id, recordDto, user);
    }

    if (dto.notes !== undefined) {
      return toTripDto(await this.repo.update(trip.id, { notes: dto.notes }));
    }
    const full = await this.repo.findWithRefs(trip.id);
    if (!full) {
      throw new NotFoundException('Trip tidak ditemukan.');
    }
    return toTripDto(full);
  }

  async getById(idParam: string): Promise<TripDetailDto> {
    const trip = await this.repo.findFull(idParam);
    if (!trip) {
      throw new NotFoundException('Trip tidak ditemukan.');
    }
    return toDetailDto(trip);
  }

  async record(idParam: string, dto: RecordTripDto, user: SessionUser): Promise<TripDto> {
    const trip = await this.repo.findForRecording(idParam);
    if (!trip) {
      throw new NotFoundException('Trip tidak ditemukan.');
    }

    const granted = await this.rolePermissions.getPermissionKeys(user.roleId);

    if (trip.status === 'VERIFIED' && !hasPermission(granted, 'trip:override')) {
      throw new ForbiddenException('Trip telah diverifikasi dan tidak dapat diubah.');
    }

    const category = trip.route?.category ?? 'DEPART_POOL';
    const requiredPermission = CATEGORY_PERMISSION[category] ?? 'trip:update';
    if (!hasPermission(granted, requiredPermission)) {
      throw new ForbiddenException('Akses ditolak untuk mencatat trip ini.');
    }

    this.assertOdometerChain(trip, dto.actualOdometer);

    // Recording (including an authorized override of a verified trip) lands the
    // trip back at DONE — an edit invalidates any prior verification, so it must
    // be re-verified.
    const categoryData = this.categoryData(category, dto, trip, granted);
    const data: Prisma.TripUpdateInput = {
      status: 'DONE',
      // Anchor the realization to its operation day so `actual_time`'s WIB date
      // can never diverge from `operation_date` (the FE already aligns them; this
      // makes it hold for native/API clients too).
      actualTime: anchorInstantToOperationDate(new Date(dto.actualTime), trip.operationDate),
      actualOdometer: dto.actualOdometer,
      // Set once, on first entry — an edit corrects values but keeps the original
      // entry time, so the recap's input-order numbering stays stable. (An un-record
      // clears it, so a later re-entry is correctly treated as a fresh entry.)
      realizationEntryAt: trip.realizationEntryAt ?? new Date(),
      recordedBy: { connect: { id: user.id } },
      updatedBy: { connect: { id: user.id } },
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      ...categoryData,
    };

    const updated = await this.repo.update(trip.id, data);

    // A fuel over-approval is a sensitive, permission-gated action — audit it.
    if (
      category === 'REFUEL' &&
      typeof categoryData.fuelApprovedLiters === 'number' &&
      typeof categoryData.fuelRequestedLiters === 'number' &&
      categoryData.fuelApprovedLiters > categoryData.fuelRequestedLiters
    ) {
      await this.audit.record({
        actor: user,
        action: 'trip.fuel-override',
        entityType: 'Trip',
        entityId: trip.id,
        details: `Disetujui ${categoryData.fuelApprovedLiters} L > diminta ${categoryData.fuelRequestedLiters} L`,
      });
    }

    // Keep the day's monitoring rollups live (idempotent; never throws).
    await this.rollups.refreshForOperationDate(updated.operationDate);

    return toTripDto(updated);
  }

  /**
   * Un-record a realization (the recap's soft "delete"): revert the trip to
   * IN_PROGRESS and clear the entered values, keeping the scheduled slot so it can
   * be re-entered. Mirrors {@link record}'s category gate; a verified trip needs
   * `trip:override`. Refreshes the day's rollups since tonnage/fuel change.
   */
  async unrecord(idParam: string, user: SessionUser): Promise<TripDto> {
    const trip = await this.repo.findForRecording(idParam);
    if (!trip) {
      throw new NotFoundException('Trip tidak ditemukan.');
    }
    if (trip.status === 'IN_PROGRESS') {
      throw new BadRequestException('Trip ini belum dicatat.');
    }

    const granted = await this.rolePermissions.getPermissionKeys(user.roleId);
    if (trip.status === 'VERIFIED' && !hasPermission(granted, 'trip:override')) {
      throw new ForbiddenException('Trip telah diverifikasi dan tidak dapat diubah.');
    }
    const category = trip.route?.category ?? 'DEPART_POOL';
    const requiredPermission = CATEGORY_PERMISSION[category] ?? 'trip:update';
    if (!hasPermission(granted, requiredPermission)) {
      throw new ForbiddenException('Akses ditolak untuk menghapus catatan trip ini.');
    }

    const updated = await this.repo.update(trip.id, {
      status: 'IN_PROGRESS',
      actualTime: null,
      actualOdometer: 0,
      tareWeight: 0,
      grossWeight: null,
      netWeight: null,
      wasteVolume: null,
      fuelRequestedLiters: null,
      fuelApprovedLiters: null,
      notes: null,
      realizationEntryAt: null,
      recordedBy: { disconnect: true },
      verifiedBy: { disconnect: true },
      verifiedAt: null,
      updatedBy: { connect: { id: user.id } },
    });

    await this.audit.record({
      actor: user,
      action: 'trip.unrecord',
      entityType: 'Trip',
      entityId: trip.id,
    });

    await this.rollups.refreshForOperationDate(updated.operationDate);
    return toTripDto(updated);
  }

  async verify(idParam: string, user: SessionUser): Promise<TripDto> {
    const id = idParam;
    const trip = await this.repo.findForRecording(id);
    if (!trip) {
      throw new NotFoundException('Trip tidak ditemukan.');
    }
    if (trip.status !== 'DONE') {
      throw new BadRequestException('Hanya trip yang sudah selesai yang dapat diverifikasi.');
    }
    const updated = await this.repo.update(id, {
      status: 'VERIFIED',
      verifiedBy: { connect: { id: user.id } },
      verifiedAt: new Date(),
    });
    await this.audit.record({
      actor: user,
      action: 'trip.verify',
      entityType: 'Trip',
      entityId: id,
    });

    // A verified DISPOSAL trip is what daily tonnage counts — refresh the day.
    await this.rollups.refreshForOperationDate(updated.operationDate);

    return toTripDto(updated);
  }

  /** actualOdometer must be ≥ the highest odometer already recorded on this leg.
   * A negative value is the "not captured" sentinel (e.g. TPA disposal, where the
   * weighbridge reads weight, not odometer) and skips the chain check. */
  private assertOdometerChain(trip: TripForRecording, actualOdometer: number): void {
    if (actualOdometer < 0) {
      return;
    }
    const siblingMax = trip.haulAssignment.trips
      .filter((sibling) => sibling.id !== trip.id && sibling.status !== 'IN_PROGRESS')
      .reduce((max, sibling) => Math.max(max, sibling.actualOdometer), 0);
    const floor = Math.max(siblingMax, trip.haulAssignment.departActualOdometer ?? 0);
    if (actualOdometer < floor) {
      throw new BadRequestException(`Odometer tidak boleh kurang dari ${floor} km.`);
    }
  }

  private categoryData(
    category: string,
    dto: RecordTripDto,
    trip: TripForRecording,
    granted: readonly string[],
  ): Prisma.TripUpdateInput {
    const vehicle = trip.haulAssignment.haul.vehicle;
    switch (category) {
      case 'REFUEL':
        return this.refuelData(dto, trip, granted);
      case 'PICKUP':
        return { tareWeight: dto.tareWeight ?? vehicle.currentTareWeight };
      case 'DISPOSAL':
        return this.disposalData(dto, vehicle.currentTareWeight);
      default:
        return {};
    }
  }

  private refuelData(
    dto: RecordTripDto,
    trip: TripForRecording,
    granted: readonly string[],
  ): Prisma.TripUpdateInput {
    const requested =
      dto.fuelRequestedLiters ??
      (trip.fuelRequestedLiters === null ? undefined : Number(trip.fuelRequestedLiters));
    if (requested === undefined) {
      throw new BadRequestException('Jumlah BBM yang diminta wajib diisi.');
    }
    const approved = dto.fuelApprovedLiters ?? requested;
    if (approved > requested && !hasPermission(granted, 'fuel:approve')) {
      throw new BadRequestException(
        'Jumlah disetujui tidak boleh melebihi jumlah yang diminta tanpa izin persetujuan BBM.',
      );
    }
    return { fuelRequestedLiters: requested, fuelApprovedLiters: approved };
  }

  private disposalData(dto: RecordTripDto, vehicleTare: number): Prisma.TripUpdateInput {
    if (dto.grossWeight === undefined) {
      throw new BadRequestException('Berat kotor wajib diisi untuk perjalanan pembuangan.');
    }
    const tareWeight = dto.tareWeight ?? vehicleTare;
    if (dto.grossWeight < tareWeight) {
      throw new BadRequestException('Penimbangan tidak valid: berat bersih akan menjadi negatif.');
    }
    return {
      grossWeight: dto.grossWeight,
      tareWeight,
      netWeight: dto.grossWeight - tareWeight,
      ...(dto.wasteVolume !== undefined ? { wasteVolume: dto.wasteVolume } : {}),
    };
  }
}
