import { apiClient } from './api-client';

/** A waste source linked to a vehicle (backend: GET/POST/DELETE sub-resource). */
export interface VehicleWasteSourceDto {
  readonly id: string;
  readonly wasteSourceId: string;
  readonly code: string;
  readonly name: string;
}

export function listVehicleWasteSources(vehicleId: string): Promise<VehicleWasteSourceDto[]> {
  return apiClient.get<VehicleWasteSourceDto[]>(`/vehicles/${vehicleId}/waste-sources`);
}

export function addVehicleWasteSource(
  vehicleId: string,
  wasteSourceId: string,
): Promise<VehicleWasteSourceDto> {
  return apiClient.post<VehicleWasteSourceDto>(`/vehicles/${vehicleId}/waste-sources`, {
    wasteSourceId,
  });
}

export function removeVehicleWasteSource(
  vehicleId: string,
  wasteSourceId: string,
): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(
    `/vehicles/${vehicleId}/waste-sources/${wasteSourceId}`,
  );
}
