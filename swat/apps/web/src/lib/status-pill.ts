/**
 * Status enum → pill mapping (specs/13-design/01-design-system.md §1.4).
 * Each status resolves to an Indonesian label and a semantic colour variant.
 * Pills render bg `-100` / text `-700` with a leading `-500` dot so colour is
 * never the sole signal.
 *
 * Semantic grouping: amber = in-progress/pending · blue = done/service ·
 * green = verified/good/approved/active · red = critical/expired · slate =
 * inactive/lost/archived.
 */
export type PillVariant = 'amber' | 'blue' | 'green' | 'red' | 'slate';

export interface PillSpec {
  readonly label: string;
  readonly variant: PillVariant;
}

/** Tailwind classes per variant (bg/text + dot). */
export const PILL_VARIANT_CLASSES: Readonly<Record<PillVariant, { badge: string; dot: string }>> = {
  amber: { badge: 'bg-warning-100 text-warning-700', dot: 'bg-warning-500' },
  blue: { badge: 'bg-info-100 text-info-700', dot: 'bg-info-500' },
  green: { badge: 'bg-success-100 text-success-700', dot: 'bg-success-500' },
  red: { badge: 'bg-danger-100 text-danger-700', dot: 'bg-danger-500' },
  slate: { badge: 'bg-neutral-100 text-neutral-700', dot: 'bg-neutral-500' },
};

/** Known status domains (matches the enums in specs/01-glossary.md §4). */
export type PillDomain =
  | 'trip'
  | 'day'
  | 'fuelQuota'
  | 'vehicle'
  | 'maintenance'
  | 'maintenanceType'
  | 'inspection'
  | 'employment'
  | 'license'
  | 'refuel'
  | 'report'
  | 'user';

type DomainMap = Readonly<Record<string, PillSpec>>;

const STATUS_PILLS: Readonly<Record<PillDomain, DomainMap>> = {
  trip: {
    IN_PROGRESS: { label: 'Belum Selesai', variant: 'amber' },
    DONE: { label: 'Selesai', variant: 'blue' },
    VERIFIED: { label: 'Terverifikasi', variant: 'green' },
  },
  day: {
    IN_PROGRESS: { label: 'Belum Selesai', variant: 'amber' },
    DONE: { label: 'Selesai', variant: 'blue' },
  },
  fuelQuota: {
    ACTIVE: { label: 'Berlaku', variant: 'green' },
    INACTIVE: { label: 'Tidak Berlaku', variant: 'slate' },
  },
  vehicle: {
    GOOD: { label: 'Baik', variant: 'green' },
    MINOR_DAMAGE: { label: 'Rusak Ringan', variant: 'amber' },
    MAJOR_DAMAGE: { label: 'Rusak Berat', variant: 'red' },
    LOST: { label: 'Hilang', variant: 'slate' },
  },
  maintenance: {
    PENDING_APPROVAL: { label: 'Belum Disetujui', variant: 'amber' },
    APPROVED: { label: 'Disetujui', variant: 'green' },
  },
  maintenanceType: {
    SERVICE: { label: 'Servis', variant: 'blue' },
    REPAIR: { label: 'Perbaikan', variant: 'amber' },
  },
  inspection: {
    PASS: { label: 'Lolos', variant: 'green' },
    ATTENTION: { label: 'Perlu Perhatian', variant: 'amber' },
    FAIL: { label: 'Tidak Lolos', variant: 'red' },
  },
  employment: {
    SATGAS: { label: 'Satgas', variant: 'blue' },
    PNS: { label: 'PNS', variant: 'green' },
    HONORER: { label: 'Honorer', variant: 'slate' },
  },
  license: {
    VALID: { label: 'Berlaku', variant: 'green' },
    EXPIRING: { label: 'Segera Habis', variant: 'amber' },
    EXPIRED: { label: 'Kedaluwarsa', variant: 'red' },
  },
  refuel: {
    FLAGGED: { label: 'Ditandai', variant: 'amber' },
  },
  report: {
    PROCESSING: { label: 'Diproses', variant: 'amber' },
  },
  user: {
    MUST_CHANGE: { label: 'Wajib ganti sandi', variant: 'amber' },
  },
};

/**
 * Resolve the pill spec for an enum value within a domain.
 * Falls back to a neutral slate pill with the raw value if unknown.
 */
export function getStatusPill(domain: PillDomain, value: string): PillSpec {
  return STATUS_PILLS[domain][value] ?? { label: value, variant: 'slate' };
}
