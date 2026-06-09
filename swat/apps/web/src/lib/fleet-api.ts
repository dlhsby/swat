import { apiClient } from './api-client';

/** A waste source linked to a vehicle (backend: GET/POST/DELETE sub-resource). */
export interface VehicleWasteSourceDto {
  readonly id: number;
  readonly wasteSourceId: number;
  readonly code: string;
  readonly name: string;
}

export function listVehicleWasteSources(vehicleId: number): Promise<VehicleWasteSourceDto[]> {
  return apiClient.get<VehicleWasteSourceDto[]>(`/vehicles/${vehicleId}/waste-sources`);
}

export function addVehicleWasteSource(
  vehicleId: number,
  wasteSourceId: number,
): Promise<VehicleWasteSourceDto> {
  return apiClient.post<VehicleWasteSourceDto>(`/vehicles/${vehicleId}/waste-sources`, {
    wasteSourceId,
  });
}

export function removeVehicleWasteSource(
  vehicleId: number,
  wasteSourceId: number,
): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(
    `/vehicles/${vehicleId}/waste-sources/${wasteSourceId}`,
  );
}
