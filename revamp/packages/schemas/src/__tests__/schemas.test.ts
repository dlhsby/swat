import { describe, expect, it } from 'vitest';

import { PaginationSchema } from '../common.schema';
import { DriverCreateSchema } from '../driver.schema';
import { RouteCreateSchema } from '../route.schema';
import { SiteCreateSchema } from '../site.schema';
import { ChangePasswordSchema, LoginSchema } from '../user.schema';
import { VehicleCreateSchema } from '../vehicle.schema';

describe('PaginationSchema', () => {
  it('applies defaults', () => {
    expect(PaginationSchema.parse({})).toEqual({ page: 1, limit: 20, order: 'asc' });
  });

  it('rejects limit above 100', () => {
    expect(PaginationSchema.safeParse({ limit: 500 }).success).toBe(false);
  });

  it('coerces string query params', () => {
    expect(PaginationSchema.parse({ page: '3', limit: '50' })).toMatchObject({
      page: 3,
      limit: 50,
    });
  });
});

describe('LoginSchema', () => {
  it('accepts valid credentials', () => {
    expect(LoginSchema.safeParse({ username: 'admin', password: 'secret' }).success).toBe(true);
  });

  it('rejects an empty username', () => {
    const result = LoginSchema.safeParse({ username: '', password: 'x' });
    expect(result.success).toBe(false);
  });
});

describe('ChangePasswordSchema', () => {
  it('enforces the password policy', () => {
    const ok = ChangePasswordSchema.safeParse({
      currentPassword: 'old',
      newPassword: 'StrongP@ss12',
      confirmPassword: 'StrongP@ss12',
    });
    expect(ok.success).toBe(true);
  });

  it('rejects a weak password', () => {
    const weak = ChangePasswordSchema.safeParse({
      currentPassword: 'old',
      newPassword: 'short',
      confirmPassword: 'short',
    });
    expect(weak.success).toBe(false);
  });

  it('rejects mismatched confirmation', () => {
    const mismatch = ChangePasswordSchema.safeParse({
      currentPassword: 'old',
      newPassword: 'StrongP@ss12',
      confirmPassword: 'StrongP@ss99',
    });
    expect(mismatch.success).toBe(false);
  });
});

describe('VehicleCreateSchema', () => {
  it('accepts a valid vehicle', () => {
    const result = VehicleCreateSchema.safeParse({
      plateNumber: 'L 1234 AB',
      modelId: 1,
      poolSiteId: 1,
      chassisNumber: 'CH-1',
      engineNumber: 'EN-1',
      currentTareWeight: 8000,
      currentOdometer: 1000,
      registrationExpiry: '2027-01-01',
      taxExpiry: '2027-01-01',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing plate number', () => {
    expect(VehicleCreateSchema.safeParse({ plateNumber: '' }).success).toBe(false);
  });
});

describe('RouteCreateSchema', () => {
  it('rejects identical origin and destination', () => {
    const result = RouteCreateSchema.safeParse({
      category: 'DISPOSAL',
      originSiteId: 1,
      destinationSiteId: 1,
      distanceKm: 10,
    });
    expect(result.success).toBe(false);
  });

  it('accepts a valid route', () => {
    const result = RouteCreateSchema.safeParse({
      category: 'DISPOSAL',
      originSiteId: 1,
      destinationSiteId: 2,
      distanceKm: 10,
    });
    expect(result.success).toBe(true);
  });
});

describe('DriverCreateSchema', () => {
  const valid = {
    name: 'Budi',
    poolSiteId: 1,
    employmentStatus: 'SATGAS',
    idCardNumber: '3500000000000001',
    originAddress: 'Surabaya',
    currentAddress: 'Surabaya',
    birthDate: '1990-01-01',
    contact: '0800000000',
  };

  it('accepts a valid driver', () => {
    expect(DriverCreateSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a malformed NIK', () => {
    expect(DriverCreateSchema.safeParse({ ...valid, idCardNumber: '123' }).success).toBe(false);
  });

  it('rejects an invalid employment status', () => {
    expect(DriverCreateSchema.safeParse({ ...valid, employmentStatus: 'X' }).success).toBe(false);
  });
});

describe('SiteCreateSchema', () => {
  it('accepts a valid site', () => {
    const result = SiteCreateSchema.safeParse({
      type: 'TPA',
      name: 'TPA Benowo',
      address: 'Benowo',
      latitude: -7.25,
      longitude: 112.6,
    });
    expect(result.success).toBe(true);
  });

  it('rejects an out-of-range latitude', () => {
    const result = SiteCreateSchema.safeParse({
      type: 'TPA',
      name: 'TPA Benowo',
      address: 'Benowo',
      latitude: 200,
    });
    expect(result.success).toBe(false);
  });
});
