import {
  type LucideIcon,
  Fuel,
  LayoutDashboard,
  MapPin,
  Route,
  Scale,
  Shield,
  Truck,
  Users,
} from 'lucide-react';

import { cn } from '@/lib/cn';

/**
 * Thin wrapper over lucide-react. Centralises the icon set used across SWAT
 * navigation/domains so screens reference stable names (per
 * specs/13-design/01-design-system.md assets) instead of importing icons ad hoc.
 */
const ICONS = {
  dashboard: LayoutDashboard,
  vehicle: Truck,
  fuel: Fuel,
  weigh: Scale,
  shield: Shield,
  site: MapPin,
  route: Route,
  users: Users,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

interface IconProps {
  readonly name: IconName;
  readonly size?: number;
  readonly className?: string;
  readonly 'aria-label'?: string;
}

export function Icon({ name, size = 24, className, ...rest }: IconProps) {
  const Component = ICONS[name];
  return (
    <Component
      size={size}
      strokeWidth={2}
      className={cn('shrink-0', className)}
      aria-hidden={rest['aria-label'] ? undefined : true}
      {...rest}
    />
  );
}
