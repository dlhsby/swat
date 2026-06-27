import { apiClient } from './api-client';
import { type RouteCategoryValue, type TripTemplateDto } from './master-api';

export interface CreateTripTemplateBody {
  category: RouteCategoryValue;
  /** Only the Pool for a DEPART_POOL leg; omitted otherwise (origin is derived). */
  originSiteId?: string;
  /** Required for every leg except DEPART_POOL. */
  destinationSiteId?: string;
  /** Default corridor for this leg (Phase 7.8); copied to the day's trip at init. */
  corridorId?: string;
  targetTime: string;
  fuelRequestedLiters?: number;
}

export function listTripTemplates(scheduleId: string): Promise<TripTemplateDto[]> {
  return apiClient.get<TripTemplateDto[]>(`/schedule-templates/${scheduleId}/trip-templates`);
}

export function createTripTemplate(
  scheduleId: string,
  body: CreateTripTemplateBody,
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
