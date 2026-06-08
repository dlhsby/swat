/**
 * Pure legacy-row → Prisma `createMany` input mappers. Strategy (per
 * `specs/04-migration.md` §7): preserve the legacy integer PK as the new PK so
 * intra-batch FK references resolve directly, and also store it as `legacyId`
 * for traceability. Audit timestamps are set to the migration `now`.
 *
 * No DB access here — every mapper is a deterministic transform, unit-tested
 * without infrastructure (the live run is the operator's on-prem step).
 */
import { type Prisma } from '@prisma/client';

import {
  mapEmploymentStatus,
  mapFuelQuotaStatus,
  mapRouteCategory,
  mapSiteType,
  mapVehicleStatus,
} from './enums';
import {
  type LegacyDailyTonnage,
  type LegacyDriver,
  type LegacyDriverLicense,
  type LegacyFuel,
  type LegacyFuelCategory,
  type LegacyFuelQuota,
  type LegacyLevy,
  type LegacyLicenseClass,
  type LegacyNameMapRow,
  type LegacyRoute,
  type LegacySite,
  type LegacyVehicle,
  type LegacyVehicleApplication,
  type LegacyVehicleModel,
  type LegacyVehicleWasteSource,
  type LegacyWasteSource,
} from './legacy-types';
import {
  clampNonNegative,
  fixDate,
  fixGps,
  fixYear,
  legacyTimeToDate,
  nonNegativeOrNull,
  trimOrNull,
} from './transforms';

const audit = (now: Date): { createdAt: Date; updatedAt: Date } => ({
  createdAt: now,
  updatedAt: now,
});

export function mapVehicleApplication(
  r: LegacyVehicleApplication,
  now: Date,
): Prisma.VehicleApplicationCreateManyInput {
  return {
    id: r.APLIKASIKENDARAAN_ID,
    legacyId: r.APLIKASIKENDARAAN_ID,
    name: r.APLIKASIKENDARAAN_NAMA,
    ...audit(now),
  };
}

export function mapFuelCategory(
  r: LegacyFuelCategory,
  now: Date,
): Prisma.FuelCategoryCreateManyInput {
  return {
    id: r.KATEGORIBAHANBAKAR_ID,
    legacyId: r.KATEGORIBAHANBAKAR_ID,
    name: r.KATEGORIBAHANBAKAR_NAMA,
    ...audit(now),
  };
}

export function mapFuel(r: LegacyFuel, now: Date): Prisma.FuelCreateManyInput {
  return {
    id: r.BAHANBAKAR_ID,
    legacyId: r.BAHANBAKAR_ID,
    fuelCategoryId: r.KATEGORIBAHANBAKAR_ID,
    name: r.BAHANBAKAR_NAMA,
    pricePerLiter: clampNonNegative(r.BAHANBAKAR_HARGAPERLITER),
    ...audit(now),
  };
}

export function mapLicenseClass(
  r: LegacyLicenseClass,
  now: Date,
): Prisma.LicenseClassCreateManyInput {
  return {
    id: r.SIM_ID,
    legacyId: r.SIM_ID,
    name: r.SIM_NAMA,
    ...audit(now),
  };
}

export function mapSite(r: LegacySite, now: Date): Prisma.SiteCreateManyInput {
  const { latitude, longitude } = fixGps(r.SPOT_LATITUDE, r.SPOT_LONGITUDE);
  return {
    id: r.SPOT_ID,
    legacyId: r.SPOT_ID,
    type: mapSiteType(r.KATEGORISPOT_ID),
    name: r.SPOT_NAMA,
    address: r.SPOT_ALAMAT,
    latitude,
    longitude,
    ...audit(now),
  };
}

export function mapRoute(r: LegacyRoute, now: Date): Prisma.RouteCreateManyInput {
  return {
    id: r.RUTE_ID,
    legacyId: r.RUTE_ID,
    category: mapRouteCategory(r.KATEGORIRUTE_ID),
    originSiteId: r.SPOT_ASAL_ID,
    destinationSiteId: r.SPOT_TUJUAN_ID,
    distanceKm: clampNonNegative(r.RUTE_JARAK),
    ...audit(now),
  };
}

export function mapWasteSource(r: LegacyWasteSource, now: Date): Prisma.WasteSourceCreateManyInput {
  return {
    id: r.KATEGORISUMBERSAMPAH_ID,
    legacyId: r.KATEGORISUMBERSAMPAH_ID,
    code: r.KATEGORISUMBERSAMPAH_KODE,
    name: r.KATEGORISUMBERSAMPAH_NAMA,
    notes: trimOrNull(r.KATEGORISUMBERSAMPAH_KETERANGAN),
    ...audit(now),
  };
}

export function mapVehicleModel(
  r: LegacyVehicleModel,
  now: Date,
): Prisma.VehicleModelCreateManyInput {
  return {
    id: r.KATEGORIKENDARAAN_ID,
    legacyId: r.KATEGORIKENDARAAN_ID,
    applicationId: r.APLIKASIKENDARAAN_ID,
    fuelId: r.BAHANBAKAR_ID,
    brand: r.KATEGORIKENDARAAN_MERK,
    fuelTankCapacity: clampNonNegative(r.KATEGORIKENDARAAN_KAPASITASBAHANBAKAR),
    normalFuelRatio: clampNonNegative(r.KATEGORIKENDARAAN_RASIOBAHANBAKARNORMAL) || 1,
    normalTareWeight: clampNonNegative(r.KATEGORIKENDARAAN_BERATKOSONGNORMAL),
    maxNetLoad: nonNegativeOrNull(r.KATEGORIKENDARAAN_BERATBERSIHMUATANMAKSIMUM),
    maxNetVolume: nonNegativeOrNull(r.KATEGORIKENDARAAN_VOLUMEBERSIHMUATANMAKSIMUM),
    wheelCount: clampNonNegative(r.KATEGORIKENDARAAN_JUMLAHRODA),
    ...audit(now),
  };
}

export function mapVehicle(r: LegacyVehicle, now: Date): Prisma.VehicleCreateManyInput {
  return {
    id: r.KENDARAAN_ID,
    legacyId: r.KENDARAAN_ID,
    poolSiteId: r.SPOT_POOL_ID,
    modelId: r.KATEGORIKENDARAAN_ID,
    status: mapVehicleStatus(r.STATUSKENDARAAN_ID),
    plateNumber: r.KENDARAAN_NOMORPOLISI,
    chassisNumber: r.KENDARAAN_NOMORRANGKA,
    engineNumber: r.KENDARAAN_NOMORMESIN,
    manufactureYear: fixYear(r.KENDARAAN_TAHUNPEMBUATAN, now),
    currentFuelRatio: clampNonNegative(r.KENDARAAN_RASIOBAHANBAKARTERKINI) || 1,
    currentTareWeight: clampNonNegative(r.KENDARAAN_BERATKOSONGTERKINI),
    currentOdometer: clampNonNegative(r.KENDARAAN_KMTERKINI),
    // STNK/tax expiry are NOT NULL in the new schema; a zero-date legacy value
    // falls back to the migration date so the row still loads (flagged in verify).
    registrationExpiry: fixDate(r.KENDARAAN_MASABERLAKUSTNK) ?? now,
    taxExpiry: fixDate(r.KENDARAAN_MASABERLAKUPAJAKSTNK) ?? now,
    notes: trimOrNull(r.KENDARAAN_KETERANGAN),
    ...audit(now),
  };
}

export function mapVehicleWasteSource(
  r: LegacyVehicleWasteSource,
): Prisma.VehicleWasteSourceCreateManyInput {
  return {
    id: r.KATEGORISUMBERSAMPAHKENDARAAN_ID,
    vehicleId: r.KENDARAAN_ID,
    wasteSourceId: r.KATEGORISUMBERSAMPAH_ID,
  };
}

export function mapDriver(r: LegacyDriver, now: Date): Prisma.DriverCreateManyInput {
  return {
    id: r.PENGEMUDI_ID,
    legacyId: r.PENGEMUDI_ID,
    poolSiteId: r.SPOT_POOL_ID,
    employmentStatus: mapEmploymentStatus(r.STATUSKEPEGAWAIAN_ID),
    name: r.PENGEMUDI_NAMA,
    idCardNumber: r.PENGEMUDI_NOMORKTP,
    originAddress: r.PENGEMUDI_ALAMATASAL,
    currentAddress: r.PENGEMUDI_ALAMATDOMISILI,
    // Birth date is NOT NULL; a missing/zero legacy date falls back to the epoch.
    birthDate: fixDate(r.PENGEMUDI_TANGGALLAHIR) ?? new Date('1970-01-01T00:00:00.000Z'),
    contact: r.PENGEMUDI_KONTAK,
    safetyTraining: trimOrNull(r.PENGEMUDI_PELATIHANSAFETY),
    notes: trimOrNull(r.PENGEMUDI_KETERANGAN),
    ...audit(now),
  };
}

export function mapDriverLicense(
  r: LegacyDriverLicense,
  now: Date,
): Prisma.DriverLicenseCreateManyInput {
  return {
    id: r.KEPEMILIKANSIM_ID,
    legacyId: r.KEPEMILIKANSIM_ID,
    driverId: r.PENGEMUDI_ID,
    licenseClassId: r.SIM_ID,
    licenseNumber: r.KEPEMILIKANSIM_NOMORSIM,
    expiry: fixDate(r.KEPEMILIKANSIM_MASABERLAKUSIM) ?? now,
    ...audit(now),
  };
}

export function mapFuelQuota(
  r: LegacyFuelQuota,
  now: Date,
  systemUserId: number,
): Prisma.FuelQuotaCreateManyInput {
  return {
    id: BigInt(r.JATAHKITIR_ID),
    legacyId: r.JATAHKITIR_ID,
    vehicleId: r.KENDARAAN_ID,
    siteId: r.SPOT_ID,
    status: mapFuelQuotaStatus(r.STATUSJATAHKITIR_ID),
    issuedAt: fixDate(r.JATAHKITIR_WAKTUDITERBITKAN) ?? now,
    validFrom: fixDate(r.JATAHKITIR_MASABERLAKUAWAL) ?? now,
    validTo: fixDate(r.JATAHKITIR_MASABERLAKUAKHIR) ?? now,
    createdById: systemUserId,
    ...audit(now),
  };
}

export function mapDailyTonnage(
  r: LegacyDailyTonnage,
  now: Date,
): Prisma.DailyTonnageCreateManyInput {
  return {
    id: r.TONASE_ID,
    legacyId: r.TONASE_ID,
    // amount is BigInt (kg); legacy TONASE_NOMINAL is a double — round to integer.
    amount: BigInt(Math.round(r.TONASE_NOMINAL ?? 0)),
    date: fixDate(r.TONASE_TANGGAL) ?? now,
    ...audit(now),
  };
}

export function mapLevy(
  r: LegacyLevy,
  now: Date,
  systemUserId: number,
): Prisma.LevyCreateManyInput {
  return {
    id: BigInt(r.ID_KATEGORI_RETRIBUSI),
    legacyId: BigInt(r.ID_KATEGORI_RETRIBUSI),
    categoryName: r.NAMA_KATEGORI_RETRIBUSI,
    date: fixDate(r.TANGGAL) ?? now,
    amount: BigInt(r.JUMLAH ?? 0),
    createdById: systemUserId,
    ...audit(now),
  };
}

export function mapNameMap(r: LegacyNameMapRow, now: Date): Prisma.LegacyNameMapCreateManyInput {
  return {
    id: r.id,
    si: trimOrNull(r.si),
    swat: trimOrNull(r.swat),
    ...audit(now),
  };
}

/** Crew schedule (`masterdetailtransaksiangkutsampah`). Times are `@db.Time`. */
export function mapCrewSchedule(
  r: { id: number; vehicleId: number; driverId: number; departTime: string; returnTime: string },
  now: Date,
): Prisma.CrewScheduleCreateManyInput {
  return {
    id: r.id,
    legacyId: r.id,
    vehicleId: r.vehicleId,
    driverId: r.driverId,
    departTime: legacyTimeToDate(r.departTime) ?? new Date('1970-01-01T00:00:00.000Z'),
    returnTime: legacyTimeToDate(r.returnTime) ?? new Date('1970-01-01T00:00:00.000Z'),
    ...audit(now),
  };
}

/** Trip template (`mastertrayek`). `routeId` is pre-remapped through route dedupe. */
export function mapTripTemplate(
  r: {
    id: number;
    crewScheduleId: number;
    routeId: number;
    targetTime: string;
    fuel: number | null;
  },
  now: Date,
): Prisma.TripTemplateCreateManyInput {
  return {
    id: r.id,
    legacyId: r.id,
    crewScheduleId: r.crewScheduleId,
    routeId: r.routeId,
    targetTime: legacyTimeToDate(r.targetTime) ?? new Date('1970-01-01T00:00:00.000Z'),
    fuelRequestedLiters: nonNegativeOrNull(r.fuel),
    ...audit(now),
  };
}
