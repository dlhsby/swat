/**
 * id-ID / Asia-Jakarta (WIB) formatting helpers.
 * Conventions per specs/13-design/01-design-system.md §7:
 *   thousands separator ".", decimal ",", integer rupiah, WIB display.
 *
 * Date-only values are formatted from their UTC components (Prisma `@db.Date`
 * is stored as UTC midnight) to avoid timezone off-by-one. Timestamps are
 * converted UTC → WIB for time display.
 */

const ID_MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
] as const;

type DateInput = Date | string | number;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

const integerFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

function decimalFormatter(fractionDigits: number): Intl.NumberFormat {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Jakarta',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/** `Rp 8.500.000` — integer rupiah, no decimals. */
export function formatRupiah(amount: number): string {
  return `Rp ${integerFormatter.format(Math.round(amount))}`;
}

/** Form input date — `dd/MM/yyyy` (e.g. `15/03/2026`). */
export function formatDateForm(value: DateInput): string {
  const d = toDate(value);
  return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/** Display date — `d MMM yyyy`, Indonesian months (e.g. `15 Mar 2026`). */
export function formatDateDisplay(value: DateInput): string {
  const d = toDate(value);
  return `${d.getUTCDate()} ${ID_MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Time of day — `HH:mm:ss`, 24-hour, WIB (e.g. `08:30:00`). */
export function formatTime(value: DateInput): string {
  return timeFormatter.format(toDate(value));
}

/** Weight — integer kilograms (e.g. `4.250 kg`). */
export function formatWeight(kg: number): string {
  return `${integerFormatter.format(Math.round(kg))} kg`;
}

/** Distance — integer kilometres (e.g. `128.430 km`). */
export function formatDistance(km: number): string {
  return `${integerFormatter.format(Math.round(km))} km`;
}

/** Fuel — 2 decimals + litres (e.g. `45,50 L`). */
export function formatFuel(liters: number): string {
  return `${decimalFormatter(2).format(liters)} L`;
}

/** Tonnage — up to 2 decimals + ton (e.g. `12,75 ton`). */
export function formatTonnage(ton: number): string {
  return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(ton)} ton`;
}

/** Plain integer with id-ID grouping (e.g. `1.250`). */
export function formatNumber(value: number): string {
  return integerFormatter.format(value);
}

/** Initials for an avatar fallback — first letters of the first two words. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '?';
  }
  const first = words[0]?.[0] ?? '';
  const second = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return `${first}${second}`.toUpperCase();
}
