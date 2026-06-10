import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  Boxes,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  Database,
  Fuel,
  FuelIcon,
  Gauge,
  LayoutDashboard,
  type LucideIcon,
  MapPin,
  ShieldCheck,
  Ticket,
  Trash2,
  Truck,
  UserCog,
  Users,
  Wrench,
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
        key: 'routes',
        href: '/monitoring/routes',
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
        key: 'reports',
        href: '/laporan',
        icon: BarChart3,
        permission: 'report:read',
        comingSoon: true,
      },
    ],
  },
  {
    id: 'grp-master',
    key: 'masterData',
    icon: Database,
    leaves: [
      { key: 'vehicles', href: '/vehicles', icon: Truck, permission: 'vehicle:read' },
      {
        key: 'vehicleModels',
        href: '/vehicle-models',
        icon: Boxes,
        permission: 'vehicle-model:read',
      },
      {
        key: 'vehicleApplications',
        href: '/vehicle-applications',
        icon: Boxes,
        permission: 'vehicle-application:read',
      },
      { key: 'fuels', href: '/fuels', icon: Fuel, permission: 'fuel:read' },
      { key: 'drivers', href: '/drivers', icon: Users, permission: 'driver:read' },
      { key: 'sitesRoutes', href: '/sites-routes', icon: MapPin, permission: 'site:read' },
      {
        key: 'wasteSources',
        href: '/waste-sources',
        icon: Trash2,
        permission: 'waste-source:read',
      },
    ],
  },
  {
    id: 'grp-sched',
    key: 'scheduling',
    icon: CalendarDays,
    leaves: [
      {
        key: 'crewSchedules',
        href: '/crew-schedules',
        icon: CalendarClock,
        permission: 'crew-schedule:read',
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
    id: 'grp-txn',
    key: 'transactions',
    icon: ArrowLeftRight,
    leaves: [
      {
        key: 'transactionDays',
        href: '/transaction-days',
        icon: Gauge,
        permission: 'transaction-day:read',
      },
      {
        key: 'refuelLog',
        href: '/refuel-log',
        icon: FuelIcon,
        permission: 'trip:read',
      },
      {
        key: 'inspections',
        href: '/inspections',
        icon: ClipboardCheck,
        permission: 'inspection:read',
      },
      {
        key: 'maintenance',
        href: '/maintenance',
        icon: Wrench,
        permission: 'maintenance:read',
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
    ],
  },
];
