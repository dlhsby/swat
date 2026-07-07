import { Injectable } from '@nestjs/common';
import { type GasificationMatchStatus, Prisma } from '@prisma/client';

import { type PageParams, toSkipTake } from '../../../common/pagination';
import { PrismaService } from '../../prisma/prisma.service';

import { type GasificationRecord } from './gasification.types';

/** A DISPOSAL trip candidate for matching (plate + the two disposal timestamps). */
export interface DisposalTripCandidate {
  readonly id: string;
  readonly plateNumber: string;
  readonly actualTime: Date | null;
  readonly arrivedAt: Date | null;
  readonly disposalDestination: string;
}

/** The upserted entry's post-write state the sync loop needs. */
export interface UpsertedEntry {
  readonly id: string;
  readonly status: GasificationMatchStatus;
  readonly photoObjectKey: string | null;
  readonly matchedTripId: string | null;
  readonly plateNumber: string;
  readonly enteredAt: Date;
}

export interface ListGasificationFilter extends PageParams {
  readonly operationDate?: Date;
  readonly status?: GasificationMatchStatus;
}

@Injectable()
export class GasificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Idempotent insert of a pulled PTSI record, keyed by (plate, enteredAt, foto).
   * A re-poll updates only mutable metadata — never the match state or stored photo.
   */
  upsert(record: GasificationRecord): Promise<UpsertedEntry> {
    return this.prisma.gasificationEntry.upsert({
      where: {
        plateNumber_enteredAt_fotoFilename: {
          plateNumber: record.plateNumber,
          enteredAt: record.enteredAt,
          fotoFilename: record.fotoFilename,
        },
      },
      create: {
        plateNumber: record.plateNumber,
        vendorNopol: record.vendorNopol,
        enteredAt: record.enteredAt,
        operationDate: record.operationDate,
        userTally: record.userTally,
        fotoFilename: record.fotoFilename,
        rawPayload: record.raw as Prisma.InputJsonValue,
      },
      update: {
        vendorNopol: record.vendorNopol,
        userTally: record.userTally,
        operationDate: record.operationDate,
        rawPayload: record.raw as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        status: true,
        photoObjectKey: true,
        matchedTripId: true,
        plateNumber: true,
        enteredAt: true,
      },
    });
  }

  setPhoto(id: string, objectKey: string): Promise<unknown> {
    return this.prisma.gasificationEntry.update({
      where: { id },
      data: { photoObjectKey: objectKey },
    });
  }

  /** Still-unmatched entries for a WIB operation day (the matcher's work-list). */
  findUnmatchedByDate(
    operationDate: Date,
  ): Promise<Array<{ id: string; plateNumber: string; enteredAt: Date }>> {
    return this.prisma.gasificationEntry.findMany({
      where: { operationDate, status: 'UNMATCHED' },
      select: { id: true, plateNumber: true, enteredAt: true },
    });
  }

  /** DISPOSAL trips for a WIB operation day, with the plate + both disposal timestamps. */
  async disposalTripsForDate(operationDate: Date): Promise<DisposalTripCandidate[]> {
    const rows = await this.prisma.trip.findMany({
      where: { operationDate, route: { category: 'DISPOSAL' } },
      select: {
        id: true,
        actualTime: true,
        arrivedAt: true,
        disposalDestination: true,
        haulAssignment: {
          select: { haul: { select: { vehicle: { select: { plateNumber: true } } } } },
        },
      },
    });
    return rows.map((t) => ({
      id: t.id,
      plateNumber: t.haulAssignment.haul.vehicle.plateNumber,
      actualTime: t.actualTime,
      arrivedAt: t.arrivedAt,
      disposalDestination: t.disposalDestination,
    }));
  }

  /**
   * Claim a disposal trip for a gasification entry (auto or manual). Flips the trip
   * to GASIFICATION and links the entry, atomically. Returns false when the trip is
   * already claimed by another entry (the `matched_trip_id` unique index rejects it),
   * so the caller can move on rather than mis-attributing.
   */
  async claimTrip(entryId: string, tripId: string, matchedById: string | null): Promise<boolean> {
    try {
      await this.prisma.$transaction([
        this.prisma.trip.update({
          where: { id: tripId },
          data: { disposalDestination: 'GASIFICATION' },
        }),
        this.prisma.gasificationEntry.update({
          where: { id: entryId },
          data: {
            status: 'MATCHED',
            matchedTripId: tripId,
            matchedAt: new Date(),
            matchedById,
          },
        }),
      ]);
      return true;
    } catch (err) {
      // Only the matched_trip_id unique index means "trip already claimed"; any
      // other constraint violation is a real error that must propagate.
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002' &&
        String((err.meta as { target?: unknown } | undefined)?.target ?? '').includes(
          'matched_trip_id',
        )
      ) {
        return false;
      }
      throw err;
    }
  }

  /** Break a match: revert the trip to LANDFILL and free the entry (kept for audit). */
  async unmatch(entryId: string, matchedById: string | null): Promise<void> {
    const entry = await this.prisma.gasificationEntry.findUnique({
      where: { id: entryId },
      select: { matchedTripId: true },
    });
    const ops: Prisma.PrismaPromise<unknown>[] = [];
    if (entry?.matchedTripId) {
      ops.push(
        this.prisma.trip.update({
          where: { id: entry.matchedTripId },
          data: { disposalDestination: 'LANDFILL' },
        }),
      );
    }
    ops.push(
      this.prisma.gasificationEntry.update({
        where: { id: entryId },
        data: { status: 'UNMATCHED', matchedTripId: null, matchedAt: null, matchedById },
      }),
    );
    await this.prisma.$transaction(ops);
  }

  findById(id: string) {
    return this.prisma.gasificationEntry.findUnique({ where: { id } });
  }

  /** Whether a trip exists and is a DISPOSAL leg (guards manual matching). */
  async isDisposalTrip(tripId: string): Promise<boolean> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { route: { select: { category: true } } },
    });
    return trip?.route?.category === 'DISPOSAL';
  }

  async list(
    filter: ListGasificationFilter,
  ): Promise<{ rows: GasificationEntryRow[]; total: number }> {
    const where: Prisma.GasificationEntryWhereInput = {
      ...(filter.operationDate ? { operationDate: filter.operationDate } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    };
    const { skip, take } = toSkipTake(filter);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.gasificationEntry.findMany({
        where,
        orderBy: { enteredAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.gasificationEntry.count({ where }),
    ]);
    return { rows, total };
  }
}

export type GasificationEntryRow = Prisma.GasificationEntryGetPayload<Record<string, never>>;
