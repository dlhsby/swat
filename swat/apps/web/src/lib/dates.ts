/** Date helpers anchored to Asia/Jakarta (WIB), matching the operational day. */

const wibDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Today's calendar date in WIB as `YYYY-MM-DD` (the operational day key). */
export function todayWIB(): string {
  // en-CA renders ISO-style YYYY-MM-DD.
  return wibDateFormatter.format(new Date());
}

/** Convert a `Date` to a `YYYY-MM-DD` string in WIB. */
export function toDateKeyWIB(date: Date): string {
  return wibDateFormatter.format(date);
}

const wibTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Jakarta',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** Current wall-clock time in WIB as `HH:mm`. */
export function nowTimeWIB(): string {
  return wibTimeFormatter.format(new Date());
}

/** Extract `HH:mm` (WIB) from an ISO timestamp, or '' when null. */
export function timeOfWIB(iso: string | null): string {
  return iso ? wibTimeFormatter.format(new Date(iso)) : '';
}

/**
 * Combine an operational date key (`YYYY-MM-DD`) and a `HH:mm` wall-clock time
 * into a WIB-anchored ISO-8601 instant the backend can parse.
 */
export function combineDateTimeWIB(dateKey: string, hhmm: string): string {
  return `${dateKey}T${hhmm}:00+07:00`;
}
