import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { GpsidWebhookItemDto } from './dto/gpsid-webhook.dto';
import { type CanonicalPing, GPS_SOURCE_GPSID } from './gps.types';

/** Accept a device clock up to 5 minutes ahead; reject further-future timestamps. */
const FUTURE_SKEW_MS = 5 * 60 * 1000;

export interface NormalizeResult {
  readonly pings: CanonicalPing[];
  readonly accepted: number;
  /** Items dropped for failing validation or carrying an implausible timestamp. */
  readonly rejected: number;
}

/** Engine ACC state → boolean. GPS.id sends ON/OFF (sometimes "ACC ON"/"ACC OFF"). */
function engineOn(value: string | undefined): boolean {
  return value === 'ON' || value === 'ACC ON';
}

/**
 * Parse the GPS.id "YYYY-MM-DD HH:MM:SS" stamp as UTC. Returns null for an
 * unparseable value. (The vendor names it `DatetimeUTC`; whether it is truly UTC
 * or WIB is verified during integration — we store timestamptz UTC regardless.)
 */
function parseDatetimeUtc(value: string): Date | null {
  const isoish = `${value.slice(0, 10)}T${value.slice(11, 19)}Z`;
  const date = new Date(isoish);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Normalize a GPS.id webhook payload (single object OR array) into canonical
 * pings. Every item is validated independently with the {@link GpsidWebhookItemDto}
 * class-validator contract; invalid items and future-dated stamps are dropped and
 * counted (a bad item never fails the whole batch). Treats all fields as untrusted.
 */
export function normalizeGpsidPayload(body: unknown, now: Date = new Date()): NormalizeResult {
  const rawItems = Array.isArray(body) ? body : body == null ? [] : [body];
  const pings: CanonicalPing[] = [];
  let rejected = 0;

  for (const raw of rawItems) {
    if (typeof raw !== 'object' || raw === null) {
      rejected += 1;
      continue;
    }
    const dto = plainToInstance(GpsidWebhookItemDto, raw, { enableImplicitConversion: false });
    const errors = validateSync(dto, { whitelist: false, forbidUnknownValues: false });
    if (errors.length > 0) {
      rejected += 1;
      continue;
    }
    const recordedAt = parseDatetimeUtc(dto.DatetimeUTC);
    if (!recordedAt || recordedAt.getTime() > now.getTime() + FUTURE_SKEW_MS) {
      rejected += 1;
      continue;
    }
    pings.push({
      imei: dto.VehicleId,
      latitude: dto.Lat,
      longitude: dto.Lon,
      speedKmh: dto.Speed ?? 0,
      heading: dto.Direction ?? null,
      engineOn: engineOn(dto.Engine),
      odometerM: dto.Odometer ?? 0,
      recordedAt: recordedAt.toISOString(),
      source: GPS_SOURCE_GPSID,
      accuracyM: null,
      reportedPlate: dto.VehicleNumber ?? null,
    });
  }

  return { pings, accepted: pings.length, rejected };
}
