import { allMappedPermissionKeys, derivePermissionKeys } from './permission-map';

describe('derivePermissionKeys', () => {
  it('maps a vehicle menu URI to vehicle CRUD keys', () => {
    expect(derivePermissionKeys('/master/kendaraan')).toContain('vehicle:create');
  });
  it('prefers the longest prefix (kategorikendaraan over a generic match)', () => {
    expect(derivePermissionKeys('/master/kategorikendaraan/edit/3')).toContain(
      'vehicle-model:update',
    );
  });
  it('maps disposal transactions to verify + record-disposal', () => {
    const keys = derivePermissionKeys('/transaksi/pembuangan');
    expect(keys).toEqual(expect.arrayContaining(['trip:record-disposal', 'trip:verify']));
  });
  it('is case-insensitive and tolerant of trailing path', () => {
    expect(derivePermissionKeys('/MASTER/SPOT/list')).toContain('site:read');
  });
  it('returns [] for an unmapped or empty URI', () => {
    expect(derivePermissionKeys('/unknown/thing')).toEqual([]);
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
});
