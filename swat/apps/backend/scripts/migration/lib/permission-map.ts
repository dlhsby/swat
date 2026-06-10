/**
 * Maps legacy `menu` URIs → new permission keys (`resource:action`) so legacy
 * `hakaksesmenu` grants become `RolePermission` rows. See `specs/04-migration.md` §6.
 * Matching is by longest URI prefix; an unmapped menu contributes no permissions
 * (logged by the migrator for manual review).
 */

const PERMISSION_MAP: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['/master/kendaraan', ['vehicle:read', 'vehicle:create', 'vehicle:update', 'vehicle:delete']],
  [
    '/master/kategorikendaraan',
    ['vehicle-model:read', 'vehicle-model:create', 'vehicle-model:update', 'vehicle-model:delete'],
  ],
  [
    '/master/aplikasikendaraan',
    [
      'vehicle-application:read',
      'vehicle-application:create',
      'vehicle-application:update',
      'vehicle-application:delete',
    ],
  ],
  ['/master/bahanbakar', ['fuel:read', 'fuel:create', 'fuel:update', 'fuel:delete']],
  ['/master/pengemudi', ['driver:read', 'driver:create', 'driver:update', 'driver:delete']],
  ['/master/spot', ['site:read', 'site:create', 'site:update', 'site:delete']],
  ['/master/rute', ['route:read', 'route:create', 'route:update', 'route:delete']],
  [
    '/master/sumbersampah',
    ['waste-source:read', 'waste-source:create', 'waste-source:update', 'waste-source:delete'],
  ],
  [
    '/master/jatahkitir',
    [
      'disposal-permit:read',
      'disposal-permit:create',
      'disposal-permit:update',
      'disposal-permit:delete',
    ],
  ],
  [
    '/master/riwayatperawatan',
    [
      'maintenance:read',
      'maintenance:create',
      'maintenance:update',
      'maintenance:approve',
      'maintenance:delete',
    ],
  ],
  [
    '/penjadwalan',
    [
      'crew-schedule:read',
      'crew-schedule:create',
      'crew-schedule:update',
      'trip-template:read',
      'trip-template:create',
    ],
  ],
  [
    '/transaksi/pemeriksaankendaraan',
    ['inspection:read', 'inspection:create', 'inspection:update', 'inspection:delete'],
  ],
  ['/transaksi/pengambilan', ['trip:read', 'trip:record-pickup', 'trip:update']],
  ['/transaksi/pembuangan', ['trip:read', 'trip:record-disposal', 'trip:verify']],
  ['/transaksi/pengisianbahanbakar', ['trip:read', 'trip:record-fuel', 'fuel:approve']],
  ['/transaksi', ['transaction-day:read', 'transaction-day:manage', 'trip:read', 'trip:update']],
  ['/laporan', ['report:read', 'report:generate', 'report:export']],
  ['/monitoring', ['monitoring:read']],
  ['/pengguna', ['user:read', 'user:create', 'user:update', 'user:delete', 'user:manage']],
  ['/hakakses', ['role:read', 'role:create', 'role:update', 'role:delete', 'permission:read']],
];

/** Permission keys granted by a legacy menu URI (longest-prefix match). */
export function derivePermissionKeys(menuUri: string | null | undefined): string[] {
  if (!menuUri) {
    return [];
  }
  const uri = menuUri.trim().toLowerCase();
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
