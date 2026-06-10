import { makeResourceApi } from './resource-api';

/* ----------------------------- DTO types ------------------------------ */

export type VehicleStatus = 'GOOD' | 'MINOR_DAMAGE' | 'MAJOR_DAMAGE' | 'LOST';
export type EmploymentStatus = 'SATGAS' | 'PNS' | 'HONORER';
export type SiteType = 'POOL' | 'SPBU' | 'TPS' | 'TPA';
export type RouteCategoryValue = 'DEPART_POOL' | 'REFUEL' | 'PICKUP' | 'DISPOSAL' | 'RETURN_POOL';
export type DisposalPermitStatus = 'ACTIVE' | 'INACTIVE';

export interface VehicleTypeDto {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface FuelCategoryDto {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface FuelDto {
  id: string;
  fuelCategoryId: string;
  fuelCategoryName: string;
  name: string;
  pricePerLiter: number;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleModelDto {
  id: string;
  vehicleTypeId: string;
  vehicleTypeName: string;
  fuelId: string;
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
  id: string;
  plateNumber: string;
  status: VehicleStatus;
  poolSiteId: string;
  poolSiteName: string;
  modelId: string;
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
  id: string;
  name: string;
  idCardNumber: string;
  poolSiteId: string;
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
  id: string;
  name: string;
}

export interface DriverLicenseDto {
  id: string;
  driverId: string;
  licenseClassId: string;
  licenseClassName: string;
  licenseNumber: string;
  expiry: string;
  expired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SiteDto {
  id: string;
  type: SiteType;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface RouteDto {
  id: string;
  category: RouteCategoryValue;
  originSiteId: string;
  originSiteName: string;
  destinationSiteId: string;
  destinationSiteName: string;
  distanceKm: number;
  createdAt: string;
  updatedAt: string;
}

export interface WasteSourceDto {
  id: string;
  code: string;
  name: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrewScheduleDto {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  driverId: string;
  driverName: string;
  departTime: string;
  returnTime: string;
  tripTemplateCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TripTemplateDto {
  id: string;
  crewScheduleId: string;
  routeId: string;
  routeCategory: string;
  routeLabel: string;
  targetTime: string;
  fuelRequestedLiters: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface DisposalPermitDto {
  id: string;
  code: string | null;
  vehicleId: string;
  vehiclePlate: string;
  siteId: string;
  siteName: string;
  status: DisposalPermitStatus;
  issuedAt: string;
  validFrom: string;
  validTo: string;
  createdAt: string;
  updatedAt: string;
}

/* ----------------------------- resources ------------------------------ */

export const vehicleTypesApi = makeResourceApi<VehicleTypeDto>('/vehicle-types');
export const fuelCategoriesApi = makeResourceApi<FuelCategoryDto>('/fuel-categories');
export const fuelsApi = makeResourceApi<FuelDto>('/fuels');
export const vehicleModelsApi = makeResourceApi<VehicleModelDto>('/vehicle-models');
export const vehiclesApi = makeResourceApi<VehicleDto>('/vehicles');
export const driversApi = makeResourceApi<DriverDto>('/drivers');
export const sitesApi = makeResourceApi<SiteDto>('/sites');
export const routesApi = makeResourceApi<RouteDto>('/routes');
export const wasteSourcesApi = makeResourceApi<WasteSourceDto>('/waste-sources');
export const crewSchedulesApi = makeResourceApi<CrewScheduleDto>('/crew-schedules');
export const disposalPermitsApi = makeResourceApi<DisposalPermitDto>('/disposal-permits');
