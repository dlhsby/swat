import { type LegacyDriver, type LegacySite, type LegacyVehicle } from './legacy-types';
import {
  type LegacyIdMap,
  mapDailyTonnage,
  mapDriver,
  mapDisposalPermit,
  mapRoute,
  mapSite,
  mapVehicle,
  mapVehicleModel,
  resolveFk,
} from './mappers';

const NOW = new Date('2026-06-08T00:00:00.000Z');

// Stand-in legacy→UUID maps. The loader builds these from each parent table
// after insert; the mappers only resolve through them (PKs are real UUID v7).
const siteMap: LegacyIdMap = new Map([
  [1, 'uuid-site-1'],
  [2, 'uuid-site-2'],
  [3, 'uuid-site-3'],
]);
const modelMap: LegacyIdMap = new Map([[2, 'uuid-model-2']]);
const appMap: LegacyIdMap = new Map([[1, 'uuid-app-1']]);
const fuelMap: LegacyIdMap = new Map([[3, 'uuid-fuel-3']]);
const vehicleMap: LegacyIdMap = new Map([[42, 'uuid-vehicle-42']]);

describe('resolveFk', () => {
  it('returns the migrated UUID for a known legacy id', () => {
    expect(resolveFk(siteMap, 2, 'x.siteId')).toBe('uuid-site-2');
  });
  it('throws (named) when the legacy id has no migrated row', () => {
    expect(() => resolveFk(siteMap, 999, 'route.originSiteId')).toThrow(/route.originSiteId.*999/);
  });
});

describe('mapSite', () => {
  it('preserves the legacy PK as legacyId (id auto-generates) and nulls (0,0) GPS', () => {
    const row: LegacySite = {
      SPOT_ID: 12,
      KATEGORISPOT_ID: 4,
      SPOT_NAMA: 'TPA Benowo',
      SPOT_ALAMAT: 'Benowo',
      SPOT_FOTO: null,
      SPOT_LATITUDE: 0,
      SPOT_LONGITUDE: 0,
    };
    expect(mapSite(row, NOW)).toMatchObject({
      legacyId: 12,
      type: 'TPA',
      latitude: null,
      longitude: null,
    });
  });
  it('keeps valid coordinates', () => {
    const row = {
      SPOT_ID: 1,
      KATEGORISPOT_ID: 1,
      SPOT_NAMA: 'Pool',
      SPOT_ALAMAT: 'x',
      SPOT_FOTO: null,
      SPOT_LATITUDE: '-7.25',
      SPOT_LONGITUDE: '112.75',
    };
    expect(mapSite(row, NOW)).toMatchObject({ latitude: -7.25, longitude: 112.75, type: 'POOL' });
  });
});

describe('mapVehicle', () => {
  const base: LegacyVehicle = {
    KENDARAAN_ID: 5,
    SPOT_POOL_ID: 1,
    STATUSKENDARAAN_ID: 1,
    KATEGORIKENDARAAN_ID: 2,
    KENDARAAN_NOMORPOLISI: 'L 1 AB',
    KENDARAAN_NOMORRANGKA: 'CH1',
    KENDARAAN_NOMORMESIN: 'EN1',
    KENDARAAN_TAHUNPEMBUATAN: 1900,
    KENDARAAN_RASIOBAHANBAKARTERKINI: 1,
    KENDARAAN_BERATKOSONGTERKINI: 4200,
    KENDARAAN_KMTERKINI: -5,
    KENDARAAN_MASABERLAKUSTNK: '0000-00-00',
    KENDARAAN_MASABERLAKUPAJAKSTNK: '2027-01-01',
    KENDARAAN_KETERANGAN: '  ',
  };
  it('resolves pool/model FKs, nulls bogus 1900 year, clamps odometer, falls back zero-date STNK', () => {
    const out = mapVehicle(base, NOW, siteMap, modelMap);
    expect(out).toMatchObject({
      legacyId: 5,
      poolSiteId: 'uuid-site-1',
      modelId: 'uuid-model-2',
      status: 'GOOD',
      manufactureYear: null,
      currentOdometer: 0,
      notes: null,
    });
    expect(out.registrationExpiry).toEqual(NOW);
    expect(out.taxExpiry).toEqual(new Date('2027-01-01T00:00:00.000Z'));
  });
});

describe('mapVehicleModel', () => {
  it('resolves application/fuel FKs, defaults a zero fuel ratio to 1 and nulls optional maxima', () => {
    const out = mapVehicleModel(
      {
        KATEGORIKENDARAAN_ID: 2,
        APLIKASIKENDARAAN_ID: 1,
        BAHANBAKAR_ID: 3,
        KATEGORIKENDARAAN_MERK: 'Hino',
        KATEGORIKENDARAAN_KAPASITASBAHANBAKAR: 200,
        KATEGORIKENDARAAN_RASIOBAHANBAKARNORMAL: 0,
        KATEGORIKENDARAAN_BERATKOSONGNORMAL: 4000,
        KATEGORIKENDARAAN_BERATBERSIHMUATANMAKSIMUM: null,
        KATEGORIKENDARAAN_VOLUMEBERSIHMUATANMAKSIMUM: null,
        KATEGORIKENDARAAN_JUMLAHRODA: 6,
      },
      NOW,
      appMap,
      fuelMap,
    );
    expect(out).toMatchObject({
      applicationId: 'uuid-app-1',
      fuelId: 'uuid-fuel-3',
      normalFuelRatio: 1,
      maxNetLoad: null,
      maxNetVolume: null,
    });
  });
});

describe('mapDriver', () => {
  it('resolves the pool FK, falls back a missing birth date to the epoch and trims notes', () => {
    const row: LegacyDriver = {
      PENGEMUDI_ID: 3,
      SPOT_POOL_ID: 1,
      STATUSKEPEGAWAIAN_ID: 2,
      PENGEMUDI_NAMA: 'Budi',
      PENGEMUDI_NOMORKTP: '3500000000000001',
      PENGEMUDI_ALAMATASAL: 'A',
      PENGEMUDI_ALAMATDOMISILI: 'B',
      PENGEMUDI_TANGGALLAHIR: '0000-00-00',
      PENGEMUDI_KONTAK: '0812',
      PENGEMUDI_PELATIHANSAFETY: 'BELUM',
      PENGEMUDI_KETERANGAN: ' AKTIF ',
    };
    const out = mapDriver(row, NOW, siteMap);
    expect(out).toMatchObject({
      legacyId: 3,
      poolSiteId: 'uuid-site-1',
      employmentStatus: 'PNS',
      notes: 'AKTIF',
    });
    expect(out.birthDate).toEqual(new Date('1970-01-01T00:00:00.000Z'));
  });
});

describe('mapRoute / mapDisposalPermit / mapDailyTonnage', () => {
  it('maps a route category + distance and resolves the site FKs', () => {
    expect(
      mapRoute(
        { RUTE_ID: 7, KATEGORIRUTE_ID: 3, SPOT_ASAL_ID: 1, SPOT_TUJUAN_ID: 2, RUTE_JARAK: 12 },
        NOW,
        siteMap,
      ),
    ).toMatchObject({
      legacyId: 7,
      category: 'PICKUP',
      originSiteId: 'uuid-site-1',
      destinationSiteId: 'uuid-site-2',
      distanceKm: 12,
    });
  });
  it('maps a kitir to a disposal permit, resolving vehicle/site FKs + system creator', () => {
    const out = mapDisposalPermit(
      {
        JATAHKITIR_ID: 5001,
        STATUSJATAHKITIR_ID: 1,
        SPOT_ID: 3,
        KENDARAAN_ID: 42,
        JATAHKITIR_WAKTUDITERBITKAN: '2026-01-01',
        JATAHKITIR_MASABERLAKUAWAL: '2026-01-01',
        JATAHKITIR_MASABERLAKUAKHIR: '2026-12-31',
      },
      NOW,
      'system-user-id',
      vehicleMap,
      siteMap,
    );
    expect(out).toMatchObject({
      legacyId: 5001,
      vehicleId: 'uuid-vehicle-42',
      siteId: 'uuid-site-3',
      status: 'ACTIVE',
      createdById: 'system-user-id',
    });
  });
  it('rounds tonnage double to a BigInt amount', () => {
    const out = mapDailyTonnage(
      { TONASE_ID: 1, TONASE_TANGGAL: '2026-05-01', TONASE_NOMINAL: 12345.7 },
      NOW,
    );
    expect(out.amount).toBe(12346n);
  });
});
