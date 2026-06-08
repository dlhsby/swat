import { makeResourceApi } from './resource-api';

/* ----------------------------- DTO types ------------------------------ */

export type VehicleStatus = 'GOOD' | 'MINOR_DAMAGE' | 'MAJOR_DAMAGE' | 'LOST';
export type EmploymentStatus = 'SATGAS' | 'PNS' | 'HONORER';
export type SiteType = 'POOL' | 'SPBU' | 'TPS' | 'TPA';
export type RouteCategoryValue = 'DEPART_POOL' | 'REFUEL' | 'PICKUP' | 'DISPOSAL' | 'RETURN_POOL';
export type FuelQuotaStatus = 'ACTIVE' | 'INACTIVE';

export interface VehicleApplicationDto {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface FuelCategoryDto {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface FuelDto {
  id: number;
  fuelCategoryId: number;
  fuelCategoryName: string;
  name: string;
  pricePerLiter: number;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleModelDto {
  id: number;
  applicationId: number;
  applicationName: string;
  fuelId: number;
  fuelName: string;
  brand: string;
  fuelTankCapacity: number;
  normalFuelRatio: number;
  normalTareWeight: number;
  maxNetLoad: number | null;
  maxNetVolume: number | null;
  wheelCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleDto {
  id: number;
  plateNumber: string;
  status: VehicleStatus;
  poolSiteId: number;
  poolSiteName: string;
  modelId: number;
  modelBrand: string;
  chassisNumber: string;
  engineNumber: string;
  manufactureYear: number | null;
  currentFuelRatio: number;
  currentTareWeight: number;
  currentOdometer: number;
  registrationExpiry: string;
  taxExpiry: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DriverDto {
  id: number;
  name: string;
  idCardNumber: string;
  poolSiteId: number;
  poolSiteName: string;
  employmentStatus: EmploymentStatus;
  originAddress: string;
  currentAddress: string;
  birthDate: string;
  contact: string;
  safetyTraining: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LicenseClassDto {
  id: number;
  name: string;
}

export interface DriverLicenseDto {
  id: number;
  driverId: number;
  licenseClassId: number;
  licenseClassName: string;
  licenseNumber: string;
  expiry: string;
  expired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SiteDto {
  id: number;
  type: SiteType;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface RouteDto {
  id: number;
  category: RouteCategoryValue;
  originSiteId: number;
  originSiteName: string;
  destinationSiteId: number;
  destinationSiteName: string;
  distanceKm: number;
  createdAt: string;
  updatedAt: string;
}

export interface WasteSourceDto {
  id: number;
  code: string;
  name: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrewScheduleDto {
  id: number;
  vehicleId: number;
  vehiclePlate: string;
  driverId: number;
  driverName: string;
  departTime: string;
  returnTime: string;
  tripTemplateCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TripTemplateDto {
  id: number;
  crewScheduleId: number;
  routeId: number;
  routeCategory: string;
  routeLabel: string;
  targetTime: string;
  fuelRequestedLiters: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface FuelQuotaDto {
  id: string;
  code: string | null;
  vehicleId: number;
  vehiclePlate: string;
  siteId: number;
  siteName: string;
  status: FuelQuotaStatus;
  issuedAt: string;
  validFrom: string;
  validTo: string;
  createdAt: string;
  updatedAt: string;
}

/* ----------------------------- resources ------------------------------ */

export const vehicleApplicationsApi =
  makeResourceApi<VehicleApplicationDto>('/vehicle-applications');
export const fuelCategoriesApi = makeResourceApi<FuelCategoryDto>('/fuel-categories');
export const fuelsApi = makeResourceApi<FuelDto>('/fuels');
export const vehicleModelsApi = makeResourceApi<VehicleModelDto>('/vehicle-models');
export const vehiclesApi = makeResourceApi<VehicleDto>('/vehicles');
export const driversApi = makeResourceApi<DriverDto>('/drivers');
export const sitesApi = makeResourceApi<SiteDto>('/sites');
export const routesApi = makeResourceApi<RouteDto>('/routes');
export const wasteSourcesApi = makeResourceApi<WasteSourceDto>('/waste-sources');
export const crewSchedulesApi = makeResourceApi<CrewScheduleDto>('/crew-schedules');
export const fuelQuotasApi = makeResourceApi<FuelQuotaDto>('/fuel-quotas');
