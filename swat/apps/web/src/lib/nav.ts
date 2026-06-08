import {
  BarChart3,
  Boxes,
  CalendarClock,
  ClipboardCheck,
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
  /** Translation key under the `nav` namespace; omit for the top-level leaf. */
  readonly key?: string;
  readonly leaves: readonly NavLeaf[];
}

/**
 * Information architecture for the sidebar (hi-fi spec §IA). Items the user's
 * role lacks `:read` on are hidden (not disabled); not-yet-built items show a
 * "Segera" pill.
 */
export const NAV_GROUPS: readonly NavGroup[] = [
  {
    leaves: [{ key: 'dashboard', href: '/dasbor', icon: LayoutDashboard }],
  },
  {
    key: 'monitoring',
    leaves: [
      {
        key: 'volume',
        href: '/monitoring/volume',
        icon: BarChart3,
        permission: 'monitoring:read',
        comingSoon: true,
      },
      {
        key: 'fuelMonitoring',
        href: '/monitoring/bbm',
        icon: FuelIcon,
        permission: 'monitoring:read',
        comingSoon: true,
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
    key: 'masterData',
    leaves: [
      { key: 'vehicles', href: '/kendaraan', icon: Truck, permission: 'vehicle:read' },
      {
        key: 'vehicleModels',
        href: '/model-kendaraan',
        icon: Boxes,
        permission: 'vehicle-model:read',
      },
      {
        key: 'vehicleApplications',
        href: '/aplikasi-kendaraan',
        icon: Boxes,
        permission: 'vehicle-application:read',
      },
      { key: 'fuels', href: '/bahan-bakar', icon: Fuel, permission: 'fuel:read' },
      { key: 'drivers', href: '/pengemudi', icon: Users, permission: 'driver:read' },
      { key: 'sitesRoutes', href: '/spot-rute', icon: MapPin, permission: 'site:read' },
      {
        key: 'wasteSources',
        href: '/sumber-sampah',
        icon: Trash2,
        permission: 'waste-source:read',
      },
    ],
  },
  {
    key: 'scheduling',
    leaves: [
      {
        key: 'crewSchedules',
        href: '/jadwal-kru',
        icon: CalendarClock,
        permission: 'crew-schedule:read',
      },
      { key: 'fuelQuotas', href: '/jatah-kitir', icon: Ticket, permission: 'fuel-quota:read' },
    ],
  },
  {
    key: 'transactions',
    leaves: [
      {
        key: 'transactionDays',
        href: '/hari-transaksi',
        icon: Gauge,
        permission: 'transaction-day:read',
      },
      {
        key: 'refuelLog',
        href: '/pengisian-bbm',
        icon: FuelIcon,
        permission: 'trip:read',
        comingSoon: true,
      },
      {
        key: 'inspections',
        href: '/pemeriksaan',
        icon: ClipboardCheck,
        permission: 'inspection:read',
        comingSoon: true,
      },
      {
        key: 'maintenance',
        href: '/perawatan',
        icon: Wrench,
        permission: 'maintenance:read',
        comingSoon: true,
      },
    ],
  },
  {
    key: 'usersAccess',
    leaves: [
      { key: 'users', href: '/pengguna', icon: UserCog, permission: 'user:read' },
      { key: 'roles', href: '/hak-akses', icon: ShieldCheck, permission: 'role:read' },
    ],
  },
];
