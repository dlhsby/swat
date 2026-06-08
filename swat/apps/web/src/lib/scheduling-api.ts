import { apiClient } from './api-client';
import { type TripTemplateDto } from './master-api';

export function listTripTemplates(scheduleId: number): Promise<TripTemplateDto[]> {
  return apiClient.get<TripTemplateDto[]>(`/crew-schedules/${scheduleId}/trip-templates`);
}

export function createTripTemplate(
  scheduleId: number,
  body: { routeId: number; targetTime: string; fuelRequestedLiters?: number },
): Promise<TripTemplateDto> {
  return apiClient.post<TripTemplateDto>(`/crew-schedules/${scheduleId}/trip-templates`, {
    ...body,
  });
}

export function deleteTripTemplate(
  scheduleId: number,
  templateId: number,
): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(
    `/crew-schedules/${scheduleId}/trip-templates/${templateId}`,
  );
}
