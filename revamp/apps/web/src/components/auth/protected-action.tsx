'use client';

import { type ReactNode } from 'react';

import { usePermissions } from '@/hooks/use-permissions';

export interface ProtectedActionProps {
  /** A single permission key, or several (OR semantics by default). */
  permission: string | readonly string[];
  /** Require ALL of the keys instead of any. */
  requireAll?: boolean;
  children: ReactNode;
  /** Rendered when the user lacks the permission (defaults to nothing). */
  fallback?: ReactNode;
}

/**
 * Render `children` only when the current user holds the required permission(s).
 * A UX gate over the authoritative server check — keeps forbidden controls out
 * of the UI entirely (per the hi-fi spec: hide, don't disable).
 */
export function ProtectedAction({
  permission,
  requireAll = false,
  children,
  fallback = null,
}: ProtectedActionProps): JSX.Element {
  const { can, canAny, canAll } = usePermissions();
  const keys = Array.isArray(permission) ? permission : [permission as string];
  const allowed = keys.length === 1 ? can(keys[0]) : requireAll ? canAll(keys) : canAny(keys);
  return <>{allowed ? children : fallback}</>;
}
