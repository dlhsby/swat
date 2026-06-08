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
