/**
 * Pure data-quality transforms applied during legacy → PostgreSQL migration.
 * Every rule here mirrors `specs/04-migration.md` §4. Kept side-effect-free so
 * they are unit-tested without a database (the live run is the operator's
 * on-prem step — Docker/MySQL are not available in this environment).
 */

/** A legacy zero-date (`0000-00-00`) or empty value becomes NULL; else a Date. */
export function fixDate(value: string | Date | null | undefined): Date | null {
  if (value == null || value === '') {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (value.startsWith('0000-00-00')) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Bogus manufacture years (e.g. 1900) → NULL; valid range is 1960..currentYear+1. */
export function fixYear(value: number | string | null | undefined, now: Date): number | null {
  const year = typeof value === 'string' ? Number(value) : value;
  if (year == null || Number.isNaN(year)) {
    return null;
  }
  const max = now.getUTCFullYear() + 1;
  return year >= 1960 && year <= max ? year : null;
}

/** (0,0) or out-of-range coordinates → NULL. Returns a normalized lat/lng pair. */
export function fixGps(
  lat: number | string | null | undefined,
  lng: number | string | null | undefined,
): { latitude: number | null; longitude: number | null } {
  const toNum = (v: number | string | null | undefined): number | null => {
    if (v == null || v === '') {
      return null;
    }
    const n = typeof v === 'string' ? Number(v) : v;
    return Number.isNaN(n) ? null : n;
  };
  const la = toNum(lat);
  const lo = toNum(lng);
  return {
    latitude: la !== null && la !== 0 && Math.abs(la) <= 90 ? la : null,
    longitude: lo !== null && lo !== 0 && Math.abs(lo) <= 180 ? lo : null,
  };
}

/** Reject negative numerics (odometer, weights, distances) → clamp to 0. */
export function clampNonNegative(value: number | string | null | undefined): number {
  const n = typeof value === 'string' ? Number(value) : value;
  if (n == null || Number.isNaN(n) || n < 0) {
    return 0;
  }
  return Math.trunc(n);
}

/** Optional non-negative int — null passes through; negatives/NaN → null. */
export function nonNegativeOrNull(value: number | string | null | undefined): number | null {
  if (value == null || value === '') {
    return null;
  }
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isNaN(n) || n < 0 ? null : Math.trunc(n);
}

/** Trim a legacy string; empty/whitespace → null. */
export function trimOrNull(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** Legacy `time` ("HH:MM:SS") → a Date anchored at 1970-01-01 UTC (Prisma `@db.Time`). */
export function legacyTimeToDate(value: string | null | undefined): Date | null {
  if (value == null || value === '') {
    return null;
  }
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) {
    return null;
  }
  return new Date(`1970-01-01T${match[1]}:${match[2]}:${match[3] ?? '00'}.000Z`);
}

/** Dedupe key for a legacy route — (origin, destination, category). */
export function routeDedupeKey(
  originSiteId: number,
  destinationSiteId: number,
  categoryId: number,
): string {
  return `${originSiteId}|${destinationSiteId}|${categoryId}`;
}

/**
 * Dedupe legacy routes by (origin, destination, category). Returns the kept rows
 * (first occurrence wins) and the dropped duplicates for the migration report.
 */
export function dedupeRoutes<T>(
  rows: readonly T[],
  keyOf: (row: T) => string,
): { kept: T[]; dropped: T[] } {
  const seen = new Set<string>();
  const kept: T[] = [];
  const dropped: T[] = [];
  for (const row of rows) {
    const key = keyOf(row);
    if (seen.has(key)) {
      dropped.push(row);
    } else {
      seen.add(key);
      kept.push(row);
    }
  }
  return { kept, dropped };
}
