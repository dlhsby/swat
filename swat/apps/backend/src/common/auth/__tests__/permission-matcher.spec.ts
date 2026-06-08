import { hasAllPermissions, hasPermission, permissionMatches } from '../permission-matcher';

describe('permission-matcher', () => {
  describe('permissionMatches', () => {
    it('matches an exact key', () => {
      expect(permissionMatches('vehicle:create', 'vehicle:create')).toBe(true);
    });

    it('does not match a different resource or action', () => {
      expect(permissionMatches('vehicle:create', 'driver:create')).toBe(false);
      expect(permissionMatches('vehicle:create', 'vehicle:delete')).toBe(false);
    });

    it('matches a resource wildcard', () => {
      expect(permissionMatches('vehicle:*', 'vehicle:delete')).toBe(true);
      expect(permissionMatches('vehicle:*', 'driver:delete')).toBe(false);
    });

    it('matches an action wildcard', () => {
      expect(permissionMatches('*:read', 'vehicle:read')).toBe(true);
      expect(permissionMatches('*:read', 'vehicle:create')).toBe(false);
    });

    it('matches the superuser wildcard', () => {
      expect(permissionMatches('*:*', 'anything:goes')).toBe(true);
    });
  });

  describe('hasPermission', () => {
    it('is true when any granted key satisfies the requirement', () => {
      expect(hasPermission(['driver:read', 'vehicle:*'], 'vehicle:update')).toBe(true);
    });

    it('is false on an empty grant set', () => {
      expect(hasPermission([], 'vehicle:read')).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('requires every key (AND semantics)', () => {
      expect(hasAllPermissions(['vehicle:*'], ['vehicle:read', 'vehicle:update'])).toBe(true);
      expect(hasAllPermissions(['vehicle:read'], ['vehicle:read', 'vehicle:update'])).toBe(false);
    });

    it('is vacuously true when nothing is required', () => {
      expect(hasAllPermissions([], [])).toBe(true);
    });

    it('lets the superuser wildcard satisfy any requirement set', () => {
      expect(hasAllPermissions(['*:*'], ['user:create', 'role:delete', 'trip:verify'])).toBe(true);
    });
  });
});
