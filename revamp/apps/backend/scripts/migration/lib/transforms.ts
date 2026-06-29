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

/**
 * Parse a legacy `DD-MM-YYYY` label (e.g. the `sampahmasuktpa.tgltitle` weighing
 * date) into a UTC midnight Date. Returns null for empty/zero/malformed values —
 * `fixDate`'s `new Date(...)` mis-parses or rejects this day-first format.
 */
export function parseDmyDate(value: string | null | undefined): Date | null {
  if (value == null) {
    return null;
  }
  const m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(value.trim());
  if (!m) {
    return null;
  }
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  // Reject overflow (e.g. 31-02 rolling into March).
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date;
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

/**
 * The DB enforces approved fuel ≤ requested (`trip_fuel_approved_lte_requested`).
 * Legacy data has ~100k trips where approved > requested (data-entry artifacts);
 * clamp approved down to requested so the row loads. Nulls pass through (the
 * constraint allows a null on either side).
 */
export function capApprovedFuel(requested: number | null, approved: number | null): number | null {
  if (approved == null || requested == null) {
    return approved;
  }
  return approved > requested ? requested : approved;
}

/**
 * The DB enforces gross ≥ tare (`trip_gross_weight_gte_tare_weight`). ~1k legacy
 * trips have a gross reading below the tare (a faulty weighing); null the gross so
 * the row loads (the CHECK permits a null gross). netWeight is mapped separately
 * and unaffected.
 */
export function grossOrNullIfBelowTare(tare: number, gross: number | null): number | null {
  if (gross == null) {
    return null;
  }
  return gross < tare ? null : gross;
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
 * Resolve the username a legacy user is loaded under, preserving the demo/seed
 * accounts. The demo seeder creates bootstrap users (`admin`, `adminreset`, the
 * per-role demo logins) with no `legacyId`; a legacy user whose username collides
 * with one of those would otherwise clobber it on the unique-username upsert
 * (stealing the `admin` login). When `reserved` already holds the raw username we
 * suffix the legacy one (`admin` → `admin_legacy70`) so BOTH survive — the demo
 * login stays usable and the legacy user is still imported + FK-resolvable.
 * Idempotent: the suffix is derived from the stable legacy id.
 */
export function resolveLegacyUsername(
  rawUsername: string,
  legacyId: number,
  reserved: ReadonlySet<string>,
): string {
  const username = rawUsername.trim() || `legacy_${legacyId}`;
  return reserved.has(username) ? `${username}_legacy${legacyId}` : username;
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
