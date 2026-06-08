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
