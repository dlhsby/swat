import {
  Activity,
  ArrowLeftRight,
  Database,
  type LucideIcon,
  Navigation,
  Settings,
  Users,
} from 'lucide-react';

/**
 * Presentation taxonomy for the role permission editor: groups the flat
 * permission catalog into functional categories (mirroring the sidebar IA in
 * `nav.ts`) and renders every key with an Indonesian label.
 *
 * Lives on the frontend by design — the DB/API keep English domain terms
 * (`vehicle:read`), and user-facing display reconciles to the operators'
 * vocabulary here (see CLAUDE.md). Labels are derived from the `<resource>:<action>`
 * key, so new permissions are covered automatically once their resource is mapped.
 */

export interface PermissionCategory {
  readonly id: string;
  readonly label: string;
  readonly icon: LucideIcon;
  /** Resources (the segment before `:`) that belong to this category, in display order. */
  readonly resources: readonly string[];
}

export const PERMISSION_CATEGORIES: readonly PermissionCategory[] = [
  {
    id: 'master',
    label: 'Master Data',
    icon: Database,
    resources: [
      'vehicle',
      'vehicle-model',
      'vehicle-type',
      'fuel',
      'fuel-category',
      'driver',
      'license',
      'site',
      'route',
      'corridor',
      'waste-source',
      'schedule-template',
      'trip-template',
    ],
  },
  {
    id: 'operasional',
    label: 'Pengangkutan & Operasional',
    icon: ArrowLeftRight,
    resources: [
      'transaction-day',
      'haul',
      'trip',
      'disposal-permit',
      'inspection',
      'maintenance',
      'weighbridge',
    ],
  },
  {
    id: 'monitoring',
    label: 'Monitoring & Laporan',
    icon: Activity,
    resources: ['monitoring', 'report', 'levy'],
  },
  {
    id: 'pelacakan',
    label: 'GPS & Pelacakan',
    icon: Navigation,
    resources: ['gps-device', 'tracking', 'route-geometry', 'deviation-rule', 'deviation-alert'],
  },
  {
    id: 'akses',
    label: 'Pengguna & Akses',
    icon: Users,
    resources: ['user', 'role', 'permission'],
  },
  {
    id: 'sistem',
    label: 'Sistem',
    icon: Settings,
    resources: ['system-config', 'service-account', 'archive'],
  },
];

/** Fallback bucket for any resource not mapped above (keeps new keys visible). */
export const OTHER_CATEGORY: PermissionCategory = {
  id: 'lainnya',
  label: 'Lainnya',
  icon: Database,
  resources: [],
};

const RESOURCE_LABELS: Readonly<Record<string, string>> = {
  vehicle: 'Kendaraan',
  'vehicle-model': 'Model Kendaraan',
  'vehicle-type': 'Tipe Kendaraan',
  fuel: 'Bahan Bakar',
  'fuel-category': 'Kategori Bahan Bakar',
  driver: 'Pengemudi',
  license: 'SIM',
  site: 'Lokasi',
  route: 'Rute',
  corridor: 'Koridor',
  'waste-source': 'Sumber Sampah',
  'schedule-template': 'Template Jadwal',
  'trip-template': 'Template Perjalanan',
  'transaction-day': 'Hari Transaksi',
  haul: 'Pengangkutan Sampah',
  trip: 'Perjalanan',
  'disposal-permit': 'Jatah Kitir',
  inspection: 'Pemeriksaan Kendaraan',
  maintenance: 'Perawatan',
  monitoring: 'Monitoring',
  report: 'Laporan',
  levy: 'Retribusi',
  user: 'Pengguna',
  role: 'Peran',
  permission: 'Izin',
  'gps-device': 'Perangkat GPS',
  tracking: 'Pelacakan',
  'route-geometry': 'Geometri Rute',
  'deviation-rule': 'Aturan Penyimpangan',
  'deviation-alert': 'Peringatan Penyimpangan',
  'system-config': 'Setelan Sistem',
  'service-account': 'Akun Layanan',
  weighbridge: 'Jembatan Timbang',
  archive: 'Arsip',
};

const ACTION_LABELS: Readonly<Record<string, string>> = {
  read: 'Lihat',
  create: 'Tambah',
  update: 'Ubah',
  delete: 'Hapus',
  manage: 'Kelola',
  verify: 'Verifikasi',
  override: 'Override verifikasi',
  export: 'Ekspor',
  generate: 'Hasilkan',
  approve: 'Setujui',
  acknowledge: 'Konfirmasi',
  resolve: 'Cocokkan',
  post: 'Kirim',
  'record-pickup': 'Catat Pengambilan',
  'record-disposal': 'Catat Pembuangan',
  'record-fuel': 'Catat BBM',
};

/** Indonesian label for a resource (segment before `:`). */
export function resourceLabel(resource: string): string {
  return RESOURCE_LABELS[resource] ?? resource;
}

/** Indonesian label for a permission key, e.g. `vehicle:read` → "Lihat Kendaraan". */
export function permissionLabel(key: string): string {
  const [resource, action] = key.split(':');
  const verb = ACTION_LABELS[action ?? ''] ?? action ?? '';
  return `${verb} ${resourceLabel(resource ?? key)}`.trim();
}

const RESOURCE_TO_CATEGORY: ReadonlyMap<string, string> = new Map(
  PERMISSION_CATEGORIES.flatMap((c) => c.resources.map((r) => [r, c.id] as const)),
);

/** Category id a resource belongs to, or the fallback bucket. */
export function categoryIdOf(resource: string): string {
  return RESOURCE_TO_CATEGORY.get(resource) ?? OTHER_CATEGORY.id;
}
