import {
  mapDayStatus,
  mapEmploymentStatus,
  mapFuelQuotaStatus,
  mapMaintenanceStatus,
  mapRouteCategory,
  mapSiteType,
  mapTripStatus,
  mapVehicleStatus,
} from './enums';

describe('legacy enum mappers', () => {
  it('maps site types', () => {
    expect(mapSiteType(1)).toBe('POOL');
    expect(mapSiteType(4)).toBe('TPA');
  });
  it('maps route categories', () => {
    expect(mapRouteCategory(1)).toBe('DEPART_POOL');
    expect(mapRouteCategory(2)).toBe('REFUEL');
    expect(mapRouteCategory(4)).toBe('DISPOSAL');
    expect(mapRouteCategory(5)).toBe('RETURN_POOL');
  });
  it('maps vehicle status', () => {
    expect(mapVehicleStatus(1)).toBe('GOOD');
    expect(mapVehicleStatus(3)).toBe('MAJOR_DAMAGE');
  });
  it('maps employment status', () => {
    expect(mapEmploymentStatus(2)).toBe('PNS');
  });
  it('maps fuel-quota + maintenance status', () => {
    expect(mapFuelQuotaStatus(1)).toBe('ACTIVE');
    expect(mapFuelQuotaStatus(2)).toBe('INACTIVE');
    expect(mapMaintenanceStatus(2)).toBe('APPROVED');
  });
  it('maps day vs trip status (trip has VERIFIED)', () => {
    expect(mapDayStatus(2)).toBe('DONE');
    expect(mapTripStatus(3)).toBe('VERIFIED');
  });
  it('falls back safely on unknown ids', () => {
    expect(mapSiteType(99)).toBe('TPS');
    expect(mapTripStatus(null)).toBe('IN_PROGRESS');
    expect(mapVehicleStatus(null)).toBe('GOOD');
  });
});
