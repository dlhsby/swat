/**
 * Date helpers for `@db.Date` columns. The API contract (specs/07-api-spec.md)
 * carries calendar dates as `YYYY-MM-DD` strings and timestamps as full ISO.
 * Prisma stores `@db.Date` as a UTC-midnight `Date`, so we anchor to UTC on the
 * way in and out to avoid timezone drift.
 */

/** Parse a `YYYY-MM-DD` string to a UTC-midnight Date for a `@db.Date` column. */
export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** Format a `@db.Date` Date back to `YYYY-MM-DD`. */
export function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** Parse an `HH:mm` string to a UTC-anchored Date for a `@db.Time` column. */
export function parseTimeOnly(value: string): Date {
  return new Date(`1970-01-01T${value}:00.000Z`);
}

/** Format a `@db.Time` Date back to `HH:mm`. */
export function formatTimeOnly(value: Date): string {
  return value.toISOString().slice(11, 16);
}

/** Today's calendar date as a UTC-midnight Date for a `@db.Date` column. */
export function todayDateOnly(): Date {
  return parseDateOnly(new Date().toISOString().slice(0, 10));
}

/**
 * Combine a `@db.Date` date with a `@db.Time` time into a single UTC
 * `Timestamptz` — used to anchor a schedule's target times to a given
 * operation date.
 */
export function combineDateAndTime(date: Date, time: Date): Date {
  return new Date(`${formatDateOnly(date)}T${formatTimeOnly(time)}:00.000Z`);
}

/** Add `days` (may be negative) to a `@db.Date`, staying UTC-midnight anchored. */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return parseDateOnly(formatDateOnly(result));
}

/** First day of `date`'s month as a UTC-midnight `@db.Date`. */
export function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/** First day of the month after `date`'s month — the exclusive end of a month range. */
export function startOfNextMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

/**
 * The `count` calendar dates ending at and including `end` (oldest first) —
 * the trailing window the nightly rollup/reconciliation jobs recompute.
 */
export function trailingDates(end: Date, count: number): Date[] {
  const dates: Date[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    dates.push(addDays(end, -offset));
  }
  return dates;
}

/** WIB (Asia/Jakarta) is a fixed UTC+7 with no daylight saving. */
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/** The WIB calendar date (`YYYY-MM-DD`) an instant falls on. */
export function wibDateKey(instant: Date): string {
  return new Date(instant.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * Re-anchor a realization instant onto its operation day, preserving the WIB
 * wall-clock time. A realization belongs to a known operation day, so its
 * `actual_time` must fall on the same WIB date as `operation_date`; this enforces
 * that invariant for every client. The shift is a whole number of days (WIB has no
 * DST), so `HH:mm:ss` is untouched; an already-aligned instant is returned as-is.
 */
export function anchorInstantToOperationDate(instant: Date, operationDate: Date): Date {
  const fromKey = wibDateKey(instant);
  const toKey = formatDateOnly(operationDate);
  if (fromKey === toKey) {
    return instant;
  }
  const dayDiff = Math.round(
    (Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / 86_400_000,
  );
  return new Date(instant.getTime() + dayDiff * 86_400_000);
}
