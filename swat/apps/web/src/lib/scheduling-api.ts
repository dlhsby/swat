import { apiClient } from './api-client';
import { type TripTemplateDto } from './master-api';

export function listTripTemplates(scheduleId: string): Promise<TripTemplateDto[]> {
  return apiClient.get<TripTemplateDto[]>(`/schedule-templates/${scheduleId}/trip-templates`);
}

export function createTripTemplate(
  scheduleId: string,
  body: { routeId: string; targetTime: string; fuelRequestedLiters?: number },
): Promise<TripTemplateDto> {
  return apiClient.post<TripTemplateDto>(`/schedule-templates/${scheduleId}/trip-templates`, {
    ...body,
  });
}

export function deleteTripTemplate(
  scheduleId: string,
  templateId: string,
): Promise<{ message: string }> {
  return apiClient.delete<{ message: string }>(
    `/schedule-templates/${scheduleId}/trip-templates/${templateId}`,
  );
}
