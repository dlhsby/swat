import { PERMISSION_KEYS } from '../../../src/common/auth/permission-catalog';

import { allMappedPermissionKeys, derivePermissionKeys } from './permission-map';

describe('derivePermissionKeys', () => {
  it('maps a legacy crud/ vehicle menu URI to vehicle CRUD keys', () => {
    expect(derivePermissionKeys('crud/kendaraan')).toContain('vehicle:create');
  });
  it('maps the masterdata/ alias of the same entity identically', () => {
    expect(derivePermissionKeys('masterdata/kendaraan')).toEqual(
      derivePermissionKeys('crud/kendaraan'),
    );
  });
  it('prefers the longest prefix (kategorikendaraan over kendaraan)', () => {
    const keys = derivePermissionKeys('crud/kategorikendaraan');
    expect(keys).toContain('vehicle-model:update');
    expect(keys).not.toContain('vehicle:create');
  });
  it('maps disposal pickups/disposals to the right record actions', () => {
    expect(derivePermissionKeys('transaksi/pengambilansampah')).toContain('trip:record-pickup');
    expect(derivePermissionKeys('transaksi/pembuangansampah')).toEqual(
      expect.arrayContaining(['trip:record-disposal', 'trip:verify']),
    );
  });
  it('maps retribusi to levy CRUD', () => {
    expect(derivePermissionKeys('transaksi/retribusi')).toEqual(expect.arrayContaining(['levy:read', 'levy:create'])); // prettier-ignore
  });
  it('maps monitoring/analytics/report sections', () => {
    expect(derivePermissionKeys('analisadata/tonasetps')).toEqual(['monitoring:read']);
    expect(derivePermissionKeys('home/monitoringtonase')).toEqual(['monitoring:read']);
    expect(derivePermissionKeys('home/laporan')).toContain('report:generate');
  });
  it('is case-insensitive and tolerant of a trailing path', () => {
    expect(derivePermissionKeys('MASTERDATA/SPOT/list')).toContain('site:read');
    expect(derivePermissionKeys('masterdata/pengemudi/tambahpengemudi')).toContain('driver:create');
  });
  it('returns [] for an unmapped or empty URI', () => {
    expect(derivePermissionKeys('home/unknownthing')).toEqual([]);
    expect(derivePermissionKeys('home')).toEqual([]);
    expect(derivePermissionKeys(null)).toEqual([]);
  });
});

describe('allMappedPermissionKeys', () => {
  it('returns a sorted, de-duplicated key set', () => {
    const keys = allMappedPermissionKeys();
    expect(keys).toContain('vehicle:read');
    expect(new Set(keys).size).toBe(keys.length);
    expect([...keys]).toEqual([...keys].sort());
  });

  it('only emits keys that exist in the permission catalog (no orphan grants)', () => {
    const catalog = new Set(PERMISSION_KEYS);
    const orphans = allMappedPermissionKeys().filter((k) => !catalog.has(k));
    expect(orphans).toEqual([]);
  });
});
