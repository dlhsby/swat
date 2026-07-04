/** Indonesian plate: 1–2 area letters · 1–4 digits · 1–3 series letters. */
const PLATE_PATTERN = /([A-Z]{1,2})\s*(\d{1,4})\s*([A-Z]{1,3})/g;

/**
 * Extract a normalized Indonesian license plate from a raw string.
 *
 * GPS.id names a vehicle by type + plate (e.g. `"ARMROLL 14M3-B 9552 EQ"`), and a
 * legacy SWAT plate may carry a dedup suffix (`"B9552EQ#43"`); both must reduce to
 * `"B9552EQ"` to match. Returns the LAST plate-shaped token (the vendor puts the
 * plate last, after the body type/size), or a punctuation-stripped fallback when no
 * plate shape is found. Applied to BOTH sides so the comparison is symmetric.
 */
export function extractPlate(raw: string): string {
  const upper = raw.toUpperCase();
  PLATE_PATTERN.lastIndex = 0;
  let last: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;
  while ((match = PLATE_PATTERN.exec(upper)) !== null) {
    last = match;
  }
  if (last) {
    return `${last[1]}${last[2]}${last[3]}`;
  }
  return upper.replace(/[^A-Z0-9]/g, '');
}
