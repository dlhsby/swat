/**
 * Single source of truth for the RBAC permission catalog (specs/06-auth-rbac.md
 * §2.2). Pure data + pure functions — no Nest or Prisma imports — so it can be
 * consumed by both the running app (PermissionsSyncService, guards) and the
 * standalone Prisma seed (ts-node), and exported to the API for the role editor.
 *
 * To add a permission for a new screen: add the `<resource>:<action>` key here,
 * guard the endpoint with `@RequirePermissions(...)`, gate the nav leaf, and let
 * the boot-time reconcile (or `POST /permissions/sync`, or a reseed) upsert the
 * row. Wildcard-pattern roles (`*:*`, `*:read`) gain it automatically; custom
 * roles get it assigned via the role editor.
 */

export interface PermissionCatalogEntry {
  readonly key: string;
  /** Human-readable label, e.g. "Permission to view vehicle". */
  readonly description: string;
  /** Resource prefix (segment before `:`) — used to group permissions in the UI. */
  readonly group: string;
}

/**
 * The canonical permission keys, grouped by resource for readability. The order
 * here is the catalogue order; the API sorts by key for display.
 */
export const PERMISSION_KEYS: readonly string[] = [
  // User & Auth
  'user:read',
  'user:create',
  'user:update',
  'user:delete',
  'user:manage',
  'role:read',
  'role:create',
  'role:update',
  'role:delete',
  'permission:read',
  'permission:manage',
  // Fleet
  'vehicle:read',
  'vehicle:create',
  'vehicle:update',
  'vehicle:delete',
  'vehicle-model:read',
  'vehicle-model:create',
  'vehicle-model:update',
  'vehicle-model:delete',
  'vehicle-type:read',
  'vehicle-type:create',
  'vehicle-type:update',
  'vehicle-type:delete',
  'fuel:read',
  'fuel:create',
  'fuel:update',
  'fuel:delete',
  'fuel-category:read',
  'fuel-category:create',
  'fuel-category:update',
  'fuel-category:delete',
  // Personnel
  'driver:read',
  'driver:create',
  'driver:update',
  'driver:delete',
  'license:read',
  'license:create',
  'license:update',
  'license:delete',
  // Geography
  'site:read',
  'site:create',
  'site:update',
  'site:delete',
  'route:read',
  'route:create',
  'route:update',
  'route:delete',
  // Waste
  'waste-source:read',
  'waste-source:create',
  'waste-source:update',
  'waste-source:delete',
  // Scheduling
  'schedule-template:read',
  'schedule-template:create',
  'schedule-template:update',
  'schedule-template:delete',
  'trip-template:read',
  'trip-template:create',
  'trip-template:update',
  'trip-template:delete',
  'disposal-permit:read',
  'disposal-permit:create',
  'disposal-permit:update',
  'disposal-permit:delete',
  // Transactions
  'transaction-day:read',
  'transaction-day:manage',
  'haul:read',
  'haul:create',
  'haul:update',
  'trip:read',
  'trip:create',
  'trip:update',
  'trip:record-pickup',
  'trip:record-disposal',
  'trip:record-fuel',
  'trip:verify',
  // Approve a fuel amount above what was requested.
  'fuel:approve',
  // Edit a trip after it has been verified (locked) — supervisory override.
  'trip:override',
  // Vehicle operations
  'inspection:read',
  'inspection:create',
  'inspection:update',
  'inspection:delete',
  'maintenance:read',
  'maintenance:create',
  'maintenance:update',
  'maintenance:delete',
  'maintenance:approve',
  // Monitoring & Reporting
  'monitoring:read',
  'report:read',
  'report:generate',
  'report:export',
  'levy:read',
  'levy:create',
  'levy:update',
  'levy:delete',
  // Archiving (Phase 2, Epic 2.5) — admin-only partition lifecycle.
  'archive:read',
  'archive:manage',
];

const ACTION_LABELS: Readonly<Record<string, string>> = {
  read: 'view',
  create: 'create',
  update: 'update',
  delete: 'delete',
  manage: 'administer',
  verify: 'verify',
  override: 'override verification for',
  export: 'export',
  generate: 'generate',
  approve: 'approve',
  'record-pickup': 'record pickup for',
  'record-disposal': 'record disposal for',
  'record-fuel': 'record fuel for',
};

/** English description for a permission key, derived from its resource + action. */
export function describePermission(key: string): string {
  const [resource, action] = key.split(':');
  const verb = ACTION_LABELS[action ?? ''] ?? action ?? 'access';
  return `Permission to ${verb} ${resource?.replace(/-/g, ' ')}`;
}

/** The resource segment (before `:`) — the group a permission belongs to. */
export function permissionGroup(key: string): string {
  return key.split(':')[0] ?? key;
}

/** The full catalog: every key with its description + group, in catalogue order. */
export const PERMISSION_CATALOG: readonly PermissionCatalogEntry[] = PERMISSION_KEYS.map((key) => ({
  key,
  description: describePermission(key),
  group: permissionGroup(key),
}));

/** Expand wildcard patterns (`*:*`, `resource:*`, `*:action`) into concrete keys. */
export function expandPatterns(patterns: readonly string[]): string[] {
  const expanded = new Set<string>();
  for (const pattern of patterns) {
    const [pResource, pAction] = pattern.split(':');
    for (const key of PERMISSION_KEYS) {
      const [kResource, kAction] = key.split(':');
      const resourceMatch = pResource === '*' || pResource === kResource;
      const actionMatch = pAction === '*' || pAction === kAction;
      if (resourceMatch && actionMatch) {
        expanded.add(key);
      }
    }
  }
  return [...expanded];
}
