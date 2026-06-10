import { apiClient } from './api-client';
import { type TripTemplateDto } from './master-api';

export function listTripTemplates(scheduleId: string): Promise<TripTemplateDto[]> {
  return apiClient.get<TripTemplateDto[]>(`/crew-schedules/${scheduleId}/trip-templates`);
}

export function createTripTemplate(
  scheduleId: string,
  body: { routeId: string; targetTime: string; fuelRequestedLiters?: number },
): Promise<TripTemplateDto> {
  return apiClient.post<TripTemplateDto>(`/crew-schedules/${scheduleId}/trip-templates`, {
    ...body,
  });
}

export function deleteTripTemplate(
  scheduleId: string,
  templateId: string,
): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(
    `/crew-schedules/${scheduleId}/trip-templates/${templateId}`,
  );
}
