/**
 * Maps legacy `menu` URIs → new permission keys (`resource:action`) so legacy
 * `hakaksesmenu` grants become `RolePermission` rows. See `specs/04-migration.md` §6.
 *
 * The legacy `dkp_swat` menu tree keys screens under section prefixes —
 * `crud/<entity>` and `masterdata/<entity>` (the same master entities under two
 * menus), `transaksi/<...>`, `analisadata/<...>`, and `home/<section>`. We
 * normalise the two master prefixes to a single `master/<entity>` namespace, then
 * match by longest URI prefix. An unmapped menu contributes no permissions (logged
 * by the migrator for manual review). All emitted keys must exist in the permission
 * catalog (`src/common/auth/permission-catalog.ts`).
 */

/** The four standard CRUD actions for a resource. */
function crud(resource: string): string[] {
  return [`${resource}:read`, `${resource}:create`, `${resource}:update`, `${resource}:delete`];
}

/** Collapse the legacy `crud/` and `masterdata/` master menus into one namespace. */
function normalizeUri(menuUri: string): string {
  return menuUri
    .trim()
    .toLowerCase()
    .replace(/^crud\//, 'master/')
    .replace(/^masterdata\//, 'master/');
}

const PERMISSION_MAP: ReadonlyArray<readonly [string, readonly string[]]> = [
  // ---- Master data (legacy `crud/*` and `masterdata/*` → normalised `master/*`) ----
  ['master/kendaraan', crud('vehicle')],
  ['master/statuskendaraan', ['vehicle:read', 'vehicle:update']],
  ['master/kategorikendaraan', crud('vehicle-model')],
  ['master/aplikasikendaraan', crud('vehicle-type')],
  ['master/bahanbakar', crud('fuel')],
  ['master/kategoribahanbakar', crud('fuel-category')],
  ['master/pengemudi', crud('driver')],
  ['master/statuskepegawaian', ['driver:read', 'driver:update']],
  ['master/sim', crud('license')],
  ['master/kepemilikansim', crud('license')],
  ['master/spot', crud('site')],
  ['master/kategorispot', crud('site')],
  ['master/rute', crud('route')],
  ['master/kategorirute', crud('route')],
  ['master/mastertrayek', crud('route')],
  ['master/masterdetailtrayek', crud('route')],
  ['master/trayek', crud('route')],
  ['master/dokumentasitrayek', ['route:read', 'route:update']],
  ['master/statustrayek', ['route:read']],
  // The vehicle↔source junction lives under the waste-source menu.
  ['master/kategorisumbersampahkendaraan', [...crud('waste-source'), 'vehicle:update']],
  ['master/kategorisumbersampah', crud('waste-source')],
  ['master/pengguna', [...crud('user'), 'user:manage']],
  ['master/hakaksesmenu', ['role:read', 'role:update', 'permission:read']],
  ['master/hakakses', [...crud('role'), 'permission:read']],
  ['master/menu', ['permission:read']],
  ['master/statusmenu', ['permission:read']],
  ['master/haritransaksi', ['transaction-day:read', 'transaction-day:manage']],
  ['master/statusharitransaksi', ['transaction-day:read']],
  ['master/riwayatperawatan', [...crud('maintenance'), 'maintenance:approve']],
  ['master/detailriwayatperawatan', crud('maintenance')],
  ['master/dokumentasidetailriwayatperawatan', ['maintenance:read', 'maintenance:update']],
  ['master/statusriwayatperawatan', ['maintenance:read']],
  ['master/masterdetailtransaksiangkutsampah', ['haul:read', 'haul:create', 'haul:update', 'trip:read', 'trip:update']], // prettier-ignore
  ['master/masterdetailtransaksi', ['haul:read', 'haul:create', 'haul:update', 'trip:read', 'trip:update']], // prettier-ignore
  ['master/detailtransaksiangkutsampah', ['haul:read', 'trip:read', 'trip:update']],
  ['master/statusdetailtransaksiangkutsampah', ['trip:read']],
  ['master/statustransaksiangkutsampah', ['trip:read']],
  ['master/transaksiangkutsampah', ['haul:read', 'haul:create', 'haul:update', 'trip:read', 'trip:update']], // prettier-ignore

  // ---- Transactions ----
  ['transaksi/inisiasipengangkutanharian', ['transaction-day:read', 'transaction-day:manage', 'haul:read', 'haul:create', 'haul:update']], // prettier-ignore
  ['transaksi/pemeriksaankendaraan', crud('inspection')],
  ['transaksi/pengambilansampah', ['trip:read', 'trip:record-pickup', 'trip:update']],
  ['transaksi/pembuangansampah', ['trip:read', 'trip:record-disposal', 'trip:verify']],
  ['transaksi/pengisianbahanbakar', ['trip:read', 'trip:record-fuel', 'fuel:approve']],
  ['transaksi/jatahkitir', crud('disposal-permit')],
  ['transaksi/perawatan', [...crud('maintenance'), 'maintenance:approve']],
  ['transaksi/retribusi', crud('levy')],
  ['transaksi/aktivitaspool', ['trip:read', 'transaction-day:read']],
  ['transaksi/importexcel', ['transaction-day:read', 'transaction-day:manage']],
  ['transaksi/penjadwalan', [...crud('schedule-template'), ...crud('trip-template')]],
  ['transaksi/monitoringpengangkutansampah', ['monitoring:read', 'trip:read', 'trip:create', 'trip:update']], // prettier-ignore
  ['transaksi/rekapitulasi', ['report:read', 'monitoring:read']],
  ['transaksi/transaksi', ['trip:read', 'trip:update']],

  // ---- Analytics / monitoring / reports / home sections ----
  ['analisadata', ['monitoring:read']],
  ['home/monitoring', ['monitoring:read']],
  ['home/laporan', ['report:read', 'report:generate', 'report:export']],
  ['home/transaksi', ['transaction-day:read', 'trip:read']],
];

/** Permission keys granted by a legacy menu URI (longest-prefix match). */
export function derivePermissionKeys(menuUri: string | null | undefined): string[] {
  if (!menuUri) {
    return [];
  }
  const uri = normalizeUri(menuUri);
  let best: { prefix: string; keys: readonly string[] } | null = null;
  for (const [prefix, keys] of PERMISSION_MAP) {
    if (uri.startsWith(prefix) && (best === null || prefix.length > best.prefix.length)) {
      best = { prefix, keys };
    }
  }
  return best ? [...best.keys] : [];
}

/** Every distinct permission key the map can emit (for pre-seeding Permission rows). */
export function allMappedPermissionKeys(): string[] {
  return [...new Set(PERMISSION_MAP.flatMap(([, keys]) => keys))].sort();
}
