import { apiClient } from './api-client';
import { type DriverLicenseDto, type LicenseClassDto } from './master-api';

export const licenseClassesApi = {
  list: (): Promise<LicenseClassDto[]> => apiClient.get<LicenseClassDto[]>('/license-classes'),
};

export function listDriverLicenses(driverId: string): Promise<DriverLicenseDto[]> {
  return apiClient.get<DriverLicenseDto[]>(`/drivers/${driverId}/licenses`);
}

export function createDriverLicense(
  driverId: string,
  body: { licenseClassId: string; licenseNumber: string; expiry: string },
): Promise<DriverLicenseDto> {
  return apiClient.post<DriverLicenseDto>(`/drivers/${driverId}/licenses`, { ...body });
}

export function revokeDriverLicense(
  driverId: string,
  licenseId: string,
): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(`/drivers/${driverId}/licenses/${licenseId}`);
}
