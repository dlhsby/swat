'use client';

import { useMemo } from 'react';

import { hasAllPermissions, hasAnyPermission, hasPermission } from '@/lib/permissions';
import { useAuth } from '@/providers/auth-provider';

export interface PermissionsApi {
  readonly permissions: readonly string[];
  /** True when the user holds `key` (wildcard-aware). */
  readonly can: (key: string) => boolean;
  /** True when the user holds at least one of `keys`. */
  readonly canAny: (keys: readonly string[]) => boolean;
  /** True when the user holds every one of `keys`. */
  readonly canAll: (keys: readonly string[]) => boolean;
}

/**
 * Read the current user's permission grants and test them with the shared
 * wildcard matcher. Server-side guards remain authoritative; this only shapes
 * the UI (hiding nav items / disabling actions the role lacks).
 */
export function usePermissions(): PermissionsApi {
  const { user } = useAuth();

  return useMemo<PermissionsApi>(() => {
    const permissions = user?.permissions ?? [];
    return {
      permissions,
      can: (key) => hasPermission(permissions, key),
      canAny: (keys) => hasAnyPermission(permissions, keys),
      canAll: (keys) => hasAllPermissions(permissions, keys),
    };
  }, [user]);
}
