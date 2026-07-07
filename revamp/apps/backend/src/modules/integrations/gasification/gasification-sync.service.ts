import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { addDays, formatDateOnly, parseDateOnly, wibDateKey } from '../../../common/dates';
import { paginated } from '../../../common/pagination';
import { type PaginationMeta } from '../../../common/types/api-response';
import { SystemConfigService } from '../../../config';
import { CacheService } from '../../cache/cache.service';
import { StorageService } from '../../storage/storage.service';

import { type ListGasificationQueryDto } from './dto/list-gasification.query.dto';
import { GasificationClientService } from './gasification-client.service';
import { type DisposalTripCandidate, GasificationRepository } from './gasification.repository';
import {
  type GasificationRecord,
  type GasificationSyncResult,
  normalizePlate,
} from './gasification.types';

const MS_PER_MIN = 60_000;

/** A DISPOSAL trip offered as a manual-match candidate for an entry. */
export interface CandidateTripDto {
  readonly tripId: string;
  readonly plateNumber: string;
  readonly disposalTime: string | null;
  readonly disposalDestination: string;
}

/** A pulled gasification entry as returned to the review page (photo presigned). */
export interface GasificationEntryDto {
  readonly id: string;
  readonly vendorNopol: string;
  readonly plateNumber: string;
  readonly enteredAt: string;
  readonly operationDate: string;
  readonly userTally: string | null;
  readonly status: string;
  readonly matchedTripId: string | null;
  readonly photoUrl: string | null;
}

@Injectable()
export class GasificationSyncService {
  private readonly logger = new Logger(GasificationSyncService.name);

  constructor(
    private readonly client: GasificationClientService,
    private readonly repo: GasificationRepository,
    private readonly storage: StorageService,
    private readonly systemConfig: SystemConfigService,
    private readonly cache: CacheService,
  ) {}

  /** Re-scan the last `gasification.lookbackDays` WIB days (the scheduled tick). */
  async syncRecentDays(): Promise<GasificationSyncResult[]> {
    if (!this.client.isConfigured) {
      return [];
    }
    const todayKey = wibDateKey(new Date());
    const days = Math.max(1, this.systemConfig.getGasificationLookbackDays());
    const results: GasificationSyncResult[] = [];
    for (let i = 0; i < days; i += 1) {
      const dateKey = formatDateOnly(addDays(parseDateOnly(todayKey), -i));
      // Scheduled run: honor the per-plate requery cooldown so settled/landfill
      // plates aren't re-hit every tick.
      results.push(await this.syncDate(dateKey, undefined, true));
    }
    return results;
  }

  /**
   * Pull + persist + match PTSI records for one WIB date. Upserts every record
   * (idempotent), downloads each new photo to MinIO, then matches still-unmatched
   * entries to DISPOSAL trips.
   *
   * PTSI's `/cari` requires BOTH `nopol` AND `tanggal` — a date-only query returns
   * nothing — so we query per plate: the one requested, or (auto) every plate that
   * still has an unmatched (LANDFILL) disposal trip that day. Matched plates drop out,
   * so the call volume shrinks as the day's disposals resolve.
   *
   * Vendor protection: a per-minute call cap (Redis) stops a run early if the fleet is
   * huge; the remaining plates are picked up next tick (still unmatched). On a scheduled
   * run, a per-(plate,date) cooldown skips plates queried recently so landfill trucks
   * aren't re-hit every tick. A manual/`nopol` sync ignores the cooldown (operator wants
   * it now) but still respects the rate cap.
   */
  async syncDate(
    dateKey: string,
    nopol?: string,
    scheduled = false,
  ): Promise<GasificationSyncResult> {
    const operationDate = parseDateOnly(dateKey);
    const trips = await this.repo.disposalTripsForDate(operationDate);
    const plates = nopol
      ? [normalizePlate(nopol)].filter(Boolean)
      : [
          ...new Set(
            trips
              .filter((t) => t.disposalDestination === 'LANDFILL')
              .map((t) => normalizePlate(t.plateNumber))
              .filter(Boolean),
          ),
        ];

    let fetched = 0;
    let upserted = 0;
    let rateLimited = false;
    for (const plate of plates) {
      if (scheduled && (await this.recentlyQueried(dateKey, plate))) {
        continue;
      }
      if (!(await this.underRateLimit())) {
        rateLimited = true;
        break; // remaining plates resume next tick
      }
      const records = await this.client.fetchByDate(dateKey, plate);
      if (scheduled) {
        await this.markQueried(dateKey, plate);
      }
      fetched += records.length;
      for (const record of records) {
        const entry = await this.repo.upsert(record);
        upserted += 1;
        if (!entry.photoObjectKey) {
          await this.storePhoto(entry.id, record);
        }
      }
    }
    if (rateLimited) {
      this.logger.warn(
        `Gasification sync for ${dateKey} hit the per-minute rate cap; will resume.`,
      );
    }

    const matched = await this.matchDate(operationDate, trips);
    // `skipped` = records the client dropped as malformed before they reached us.
    const skipped = 0;
    return { date: dateKey, fetched, upserted, matched, skipped };
  }

  /** True if this (plate, date) was queried within the requery-cooldown window. */
  private async recentlyQueried(dateKey: string, plate: string): Promise<boolean> {
    return (await this.cache.get(`gasif:q:${dateKey}:${plate}`)) !== null;
  }

  private async markQueried(dateKey: string, plate: string): Promise<void> {
    const ttl = this.systemConfig.getGasificationRequeryCooldownMinutes() * 60;
    await this.cache.set(`gasif:q:${dateKey}:${plate}`, 1, ttl);
  }

  /** Rolling per-minute counter of PTSI calls; false once the configured cap is hit. */
  private async underRateLimit(): Promise<boolean> {
    const max = this.systemConfig.getGasificationMaxRequestsPerMin();
    const bucket = Math.floor(Date.now() / 60_000);
    const count = await this.cache.increment(`gasif:rl:${bucket}`, 65);
    return count <= max;
  }

  /** Paginated review list, each entry with a short-lived presigned photo URL. */
  async list(
    query: ListGasificationQueryDto,
  ): Promise<{ data: GasificationEntryDto[]; meta: PaginationMeta }> {
    const { rows, total } = await this.repo.list({
      page: query.page,
      limit: query.limit,
      ...(query.date ? { operationDate: parseDateOnly(query.date) } : {}),
      ...(query.status ? { status: query.status } : {}),
    });
    const data = await Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        vendorNopol: r.vendorNopol,
        plateNumber: r.plateNumber,
        enteredAt: r.enteredAt.toISOString(),
        operationDate: formatDateOnly(r.operationDate),
        userTally: r.userTally,
        status: r.status,
        matchedTripId: r.matchedTripId,
        photoUrl: r.photoObjectKey ? await this.storage.getPresignedGetUrl(r.photoObjectKey) : null,
      })),
    );
    return paginated(data, total, query);
  }

  /** DISPOSAL trips for an entry's plate + operation day, to pick from when matching manually. */
  async candidates(entryId: string): Promise<CandidateTripDto[]> {
    const entry = await this.repo.findById(entryId);
    if (!entry) {
      throw new NotFoundException('Catatan gasifikasi tidak ditemukan.');
    }
    const trips = await this.repo.disposalTripsForDate(entry.operationDate);
    return trips
      .filter((t) => normalizePlate(t.plateNumber) === entry.plateNumber)
      .map((t) => ({
        tripId: t.id,
        plateNumber: t.plateNumber,
        disposalTime: (t.actualTime ?? t.arrivedAt)?.toISOString() ?? null,
        disposalDestination: t.disposalDestination,
      }));
  }

  /** Manually link an entry to a disposal trip (operator fixing a missed match). */
  async manualMatch(entryId: string, tripId: string, userId: string | null): Promise<void> {
    const entry = await this.repo.findById(entryId);
    if (!entry) {
      throw new NotFoundException('Catatan gasifikasi tidak ditemukan.');
    }
    if (!(await this.repo.isDisposalTrip(tripId))) {
      throw new NotFoundException('Perjalanan pembuangan tidak ditemukan.');
    }
    if (entry.matchedTripId && entry.matchedTripId !== tripId) {
      throw new ConflictException(
        'Catatan ini sudah tercocok dengan perjalanan lain; lepas dahulu.',
      );
    }
    const ok = await this.repo.claimTrip(entryId, tripId, userId);
    if (!ok) {
      throw new ConflictException('Perjalanan sudah dicocokkan dengan catatan gasifikasi lain.');
    }
  }

  /** Break an entry's match: revert the trip to LANDFILL and free the entry. */
  async unmatch(entryId: string, userId: string | null): Promise<void> {
    const entry = await this.repo.findById(entryId);
    if (!entry) {
      throw new NotFoundException('Catatan gasifikasi tidak ditemukan.');
    }
    await this.repo.unmatch(entryId, userId);
  }

  /** Match every still-unmatched entry for a day to its closest unclaimed DISPOSAL trip. */
  private async matchDate(
    operationDate: Date,
    tripsArg?: DisposalTripCandidate[],
  ): Promise<number> {
    const unmatched = await this.repo.findUnmatchedByDate(operationDate);
    const trips = tripsArg ?? (await this.repo.disposalTripsForDate(operationDate));
    if (unmatched.length === 0 || trips.length === 0) {
      return 0;
    }
    const { beforeMin, afterMin } = this.systemConfig.getGasificationMatchWindow();
    const byPlate = new Map<string, DisposalTripCandidate[]>();
    for (const trip of trips) {
      const key = normalizePlate(trip.plateNumber);
      const list = byPlate.get(key) ?? [];
      list.push(trip);
      byPlate.set(key, list);
    }
    const claimed = new Set<string>();
    let matched = 0;

    for (const entry of unmatched) {
      const best = this.pickBestTrip(
        byPlate.get(entry.plateNumber) ?? [],
        entry.enteredAt,
        beforeMin,
        afterMin,
        claimed,
      );
      if (!best) {
        continue;
      }
      const ok = await this.repo.claimTrip(entry.id, best.id, null);
      if (ok) {
        // Mark claimed locally so a later entry this run can't reuse the same trip
        // (the DB unique index is the hard guarantee; this avoids a wasted attempt).
        claimed.add(best.id);
        matched += 1;
      }
    }
    return matched;
  }

  /**
   * Choose the single closest-in-time unclaimed LANDFILL trip within the window, or
   * null. Returns null on a tie (two equally-close candidates) so an ambiguous entry
   * is left for manual matching rather than guessed — we never mis-attribute.
   */
  private pickBestTrip(
    candidates: DisposalTripCandidate[],
    enteredAt: Date,
    beforeMin: number,
    afterMin: number,
    claimed: Set<string>,
  ): DisposalTripCandidate | null {
    const scored = candidates
      .filter((t) => t.disposalDestination === 'LANDFILL' && !claimed.has(t.id))
      .flatMap((t) => {
        const tripTime = t.actualTime ?? t.arrivedAt;
        if (!tripTime) {
          return [];
        }
        const deltaMin = (enteredAt.getTime() - tripTime.getTime()) / MS_PER_MIN;
        if (deltaMin < -beforeMin || deltaMin > afterMin) {
          return [];
        }
        return [{ trip: t, abs: Math.abs(deltaMin) }];
      })
      .sort((a, b) => a.abs - b.abs);

    if (scored.length === 0) {
      return null;
    }
    if (scored.length >= 2 && scored[0]!.abs === scored[1]!.abs) {
      this.logger.warn(
        `Ambiguous gasification match (${scored.length} candidates equally close) — left unmatched.`,
      );
      return null;
    }
    return scored[0]!.trip;
  }

  /** Download a PTSI photo and store it in MinIO; record the key on the entry. */
  private async storePhoto(entryId: string, record: GasificationRecord): Promise<void> {
    const photo = await this.client.downloadPhoto(record.fotoFilename);
    if (!photo) {
      return;
    }
    const yyyy = record.operationDate.getUTCFullYear();
    const mm = String(record.operationDate.getUTCMonth() + 1).padStart(2, '0');
    const ext = extensionOf(record.fotoFilename, photo.contentType);
    const key = `gasification/${yyyy}/${mm}/${entryId}.${ext}`;
    try {
      await this.storage.uploadObject(key, photo.body, photo.contentType);
      await this.repo.setPhoto(entryId, key);
    } catch (err) {
      this.logger.warn(`Failed to store gasification photo for entry ${entryId}: ${String(err)}`);
    }
  }
}

/** File extension from the source filename, falling back to the content type. */
function extensionOf(fotoFilename: string, contentType: string): string {
  const fromName = fotoFilename.includes('.') ? fotoFilename.split('.').pop() : undefined;
  if (fromName && /^[a-zA-Z0-9]{1,5}$/.test(fromName)) {
    return fromName.toLowerCase();
  }
  if (contentType.includes('png')) {
    return 'png';
  }
  if (contentType.includes('webp')) {
    return 'webp';
  }
  return 'jpg';
}
