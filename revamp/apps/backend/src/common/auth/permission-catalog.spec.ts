import {
  PERMISSION_CATALOG,
  PERMISSION_KEYS,
  describePermission,
  expandPatterns,
  permissionGroup,
} from './permission-catalog';

describe('permission-catalog', () => {
  it('exposes a catalog entry for every key with a group + description', () => {
    expect(PERMISSION_CATALOG).toHaveLength(PERMISSION_KEYS.length);
    for (const entry of PERMISSION_CATALOG) {
      expect(entry.group).toBe(entry.key.split(':')[0]);
      expect(entry.description.length).toBeGreaterThan(0);
    }
  });

  it('has unique keys', () => {
    expect(new Set(PERMISSION_KEYS).size).toBe(PERMISSION_KEYS.length);
  });

  describe('permissionGroup', () => {
    it('returns the resource segment before the colon', () => {
      expect(permissionGroup('vehicle-model:create')).toBe('vehicle-model');
      expect(permissionGroup('trip:verify')).toBe('trip');
    });
  });

  describe('describePermission', () => {
    it('maps known actions to English verbs', () => {
      expect(describePermission('vehicle:read')).toBe('Permission to view vehicle');
      expect(describePermission('trip:record-disposal')).toBe(
        'Permission to record disposal for trip',
      );
    });

    it('falls back to the raw action for unmapped verbs', () => {
      expect(describePermission('thing:frobnicate')).toBe('Permission to frobnicate thing');
    });
  });

  describe('expandPatterns', () => {
    it('expands the global wildcard to every key', () => {
      expect(expandPatterns(['*:*'])).toHaveLength(PERMISSION_KEYS.length);
    });

    it('expands an action wildcard across resources', () => {
      const reads = expandPatterns(['*:read']);
      expect(reads).toContain('vehicle:read');
      expect(reads).toContain('trip:read');
      expect(reads).not.toContain('trip:verify');
    });

    it('expands a resource wildcard across actions', () => {
      const trip = expandPatterns(['trip:*']);
      expect(trip).toContain('trip:read');
      expect(trip).toContain('trip:verify');
      expect(trip.every((k) => k.startsWith('trip:'))).toBe(true);
    });

    it('passes exact keys through and de-duplicates overlaps', () => {
      expect(expandPatterns(['vehicle:read', 'vehicle:read'])).toEqual(['vehicle:read']);
    });
  });
});
