import { describe, expect, it } from 'vitest';

import { hasAllPermissions, hasAnyPermission, hasPermission } from '../permissions';

describe('hasPermission', () => {
  it('matches an exact key', () => {
    expect(hasPermission(['trip:verify'], 'trip:verify')).toBe(true);
    expect(hasPermission(['trip:verify'], 'trip:read')).toBe(false);
  });

  it('matches a resource wildcard', () => {
    expect(hasPermission(['trip:*'], 'trip:verify')).toBe(true);
    expect(hasPermission(['trip:*'], 'user:read')).toBe(false);
  });

  it('matches an action wildcard', () => {
    expect(hasPermission(['*:read'], 'vehicle:read')).toBe(true);
    expect(hasPermission(['*:read'], 'vehicle:update')).toBe(false);
  });

  it('matches the superuser wildcard', () => {
    expect(hasPermission(['*:*'], 'anything:goes')).toBe(true);
  });

  it('is false with no grants', () => {
    expect(hasPermission([], 'trip:read')).toBe(false);
  });
});

describe('hasAnyPermission / hasAllPermissions', () => {
  const grants = ['vehicle:read', 'driver:read'];

  it('any: true when at least one matches', () => {
    expect(hasAnyPermission(grants, ['vehicle:update', 'driver:read'])).toBe(true);
    expect(hasAnyPermission(grants, ['vehicle:update', 'driver:update'])).toBe(false);
  });

  it('all: true only when every key matches', () => {
    expect(hasAllPermissions(grants, ['vehicle:read', 'driver:read'])).toBe(true);
    expect(hasAllPermissions(grants, ['vehicle:read', 'driver:update'])).toBe(false);
  });

  it('all: a superuser grant covers every requirement', () => {
    expect(hasAllPermissions(['*:*'], ['vehicle:read', 'user:manage'])).toBe(true);
  });
});
