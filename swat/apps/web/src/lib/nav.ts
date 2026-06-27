import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  CalendarClock,
  ClipboardList,
  Database,
  FuelIcon,
  Gauge,
  KeyRound,
  LayoutDashboard,
  type LucideIcon,
  MapPin,
  ShieldCheck,
  Spline,
  Ticket,
  Trash2,
  Truck,
  UserCog,
  Users,
} from 'lucide-react';

/** A single sidebar leaf link. */
export interface NavLeaf {
  /** Translation key under the `nav` namespace. */
  readonly key: string;
  /** Locale-relative href (the locale prefix is added by the navigation Link). */
  readonly href: string;
  readonly icon: LucideIcon;
  /** Permission `:read` key gating visibility; omit to always show. */
  readonly permission?: string;
  /** Designed but not built yet — shows a "Segera" pill and does not navigate. */
  readonly comingSoon?: boolean;
}

/** A collapsible sidebar group. */
export interface NavGroup {
  /** Stable id used to track expand/collapse state; omit for the top-level leaf. */
  readonly id?: string;
  /** Translation key under the `nav` namespace; omit for the top-level leaf. */
  readonly key?: string;
  /** Group header icon (shown in the rail + collapsed state); omit for the top-level leaf. */
  readonly icon?: LucideIcon;
  /** Sort this group's leaves alphabetically by their (translated) label at render. */
  readonly sortAlpha?: boolean;
  readonly leaves: readonly NavLeaf[];
}

/**
 * Information architecture for the sidebar (hi-fi spec §IA). Items the user's
 * role lacks `:read` on are hidden (not disabled); not-yet-built items show a
 * "Segera" pill.
 */
export const NAV_GROUPS: readonly NavGroup[] = [
  {
    leaves: [{ key: 'dashboard', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    id: 'grp-monitoring',
    key: 'monitoring',
    icon: Activity,
    // Four domain pages (each a tabbed "big page" with its own embedded xlsx/pdf
    // export): Tonase Sampah, Konsumsi BBM, Pengangkutan, Retribusi. The former
    // refuel-log + standalone reports leaves folded into Konsumsi BBM / per-page.
    leaves: [
      {
        key: 'volume',
        href: '/monitoring/volume',
        icon: BarChart3,
        permission: 'monitoring:read',
      },
      {
        key: 'fuelMonitoring',
        href: '/monitoring/fuel',
        icon: FuelIcon,
        permission: 'monitoring:read',
      },
      {
        key: 'hauling',
        href: '/monitoring/hauling',
        icon: MapPin,
        permission: 'monitoring:read',
      },
      {
        key: 'levy',
        href: '/monitoring/levy',
        icon: Ticket,
        permission: 'monitoring:read',
      },
      {
        key: 'efficiency',
        href: '/monitoring/efficiency',
        icon: Gauge,
        permission: 'monitoring:read',
      },
    ],
  },
  {
    id: 'grp-master',
    key: 'masterData',
    icon: Database,
    sortAlpha: true,
    leaves: [
      { key: 'vehicles', href: '/vehicles', icon: Truck, permission: 'vehicle:read' },
      { key: 'drivers', href: '/drivers', icon: Users, permission: 'driver:read' },
      { key: 'sitesRoutes', href: '/sites-routes', icon: MapPin, permission: 'site:read' },
      { key: 'corridors', href: '/corridors', icon: Spline, permission: 'corridor:read' },
      {
        key: 'wasteSources',
        href: '/waste-sources',
        icon: Trash2,
        permission: 'waste-source:read',
      },
      // Schedule Template (parent = vehicle+driver+times; its Trip Templates are
      // edited within it). Labelled "Template Jadwal"; route slug unchanged.
      {
        key: 'scheduleTemplates',
        href: '/schedule-templates',
        icon: CalendarClock,
        permission: 'schedule-template:read',
      },
    ],
  },
  {
    id: 'grp-txn',
    key: 'pengangkutan',
    icon: ArrowLeftRight,
    leaves: [
      {
        key: 'scheduling',
        href: '/scheduling',
        icon: Gauge,
        permission: 'transaction-day:read',
      },
      // Single tabbed "Pencatatan Aktivitas" screen (pickup/disposal/refuel/pool).
      // Gated by trip:read so view-only roles can review past days; the entry form
      // inside is separately gated by trip:update.
      {
        key: 'recordActivity',
        href: '/record',
        icon: ClipboardList,
        permission: 'trip:read',
      },
      {
        key: 'disposalPermits',
        href: '/disposal-permits',
        icon: Ticket,
        permission: 'disposal-permit:read',
      },
    ],
  },
  {
    id: 'grp-users',
    key: 'usersAccess',
    icon: Users,
    leaves: [
      { key: 'users', href: '/users', icon: UserCog, permission: 'user:read' },
      { key: 'roles', href: '/roles', icon: ShieldCheck, permission: 'role:read' },
      {
        key: 'serviceAccounts',
        href: '/service-accounts',
        icon: KeyRound,
        permission: 'service-account:read',
      },
    ],
  },
];
